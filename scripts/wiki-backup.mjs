#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import { request as httpsRequest, Agent } from "node:https";
import os from "node:os";
import path from "node:path";

const app = process.env.WIKI_APP_DIR || process.cwd();
const state = path.join(app, ".wrangler");
const configFile = path.join(state, "wiki-backup-config.json");
const statusFile = path.join(state, "wiki-backup-status.json");
const requestFile = path.join(state, "wiki-backup-request.json");
const namePattern = /^wiki-\d{8}T\d{6}Z-[0-9a-f]{8}\.tar\.gpg$/;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: app, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message || result.stderr?.trim() || result.status}`);
  return result.stdout;
}
async function config() {
  const parsed = JSON.parse(await fs.readFile(configFile, "utf8"));
  if (!parsed.enabled || !["local", "webdav"].includes(parsed.target) || !parsed.passphrase || parsed.passphrase.length < 24) throw new Error("Backup-Konfiguration fehlt oder ist deaktiviert");
  if (parsed.target === "local" && process.env.WIKI_BACKUP_ALLOW_LOCAL_TEST !== "1") throw new Error("Lokale Sicherungsziele sind deaktiviert; nur NAS/WebDAV ist zulässig");
  if (![6, 12, 24, 48, 168].includes(parsed.intervalHours ?? 24)) throw new Error("Ungültiger Sicherungsrhythmus");
  if (parsed.target === "webdav" && (!/^https:\/\//i.test(parsed.webdavUrl) || !parsed.username || !parsed.password)) throw new Error("WebDAV-Konfiguration unvollständig");
  if (parsed.target === "webdav" && parsed.allowSelfSigned && !/^[A-F0-9]{64}$/.test(parsed.certificateFingerprint || "")) throw new Error("SHA-256-Zertifikatsfingerabdruck fehlt");
  if (parsed.target === "local" && (!path.isAbsolute(parsed.localPath) || parsed.localPath === "/")) throw new Error("Lokales Ziel ungültig");
  return parsed;
}
async function status(patch) {
  let old = {};
  try { old = JSON.parse(await fs.readFile(statusFile, "utf8")); } catch { /* first run */ }
  await fs.writeFile(statusFile, `${JSON.stringify({ ...old, ...patch, at: new Date().toISOString() })}\n`, { mode: 0o600 });
}
function endpoint(c, filename = "") {
  const base = new URL(c.webdavUrl.endsWith("/") ? c.webdavUrl : `${c.webdavUrl}/`);
  if (base.protocol !== "https:") throw new Error("WebDAV erfordert HTTPS");
  return filename ? new URL(encodeURIComponent(filename), base) : base;
}
function webdav(c, method, filename = "", body) {
  return new Promise((resolve, reject) => {
    const url = endpoint(c, filename);
    const req = httpsRequest(url, { method, agent: new Agent({ rejectUnauthorized: !c.allowSelfSigned }), headers: {
      Authorization: `Basic ${Buffer.from(`${c.username}:${c.password}`).toString("base64")}`,
      ...(body ? { "Content-Length": body.length, "Content-Type": "application/octet-stream" } : {}),
    } }, (res) => {
      if (c.allowSelfSigned) {
        const actual = res.socket.getPeerCertificate().fingerprint256?.replace(/:/g, "").toUpperCase();
        if (actual !== c.certificateFingerprint) { res.resume(); reject(new Error("NAS-Zertifikat hat einen anderen Fingerabdruck")); return; }
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300) resolve({ status: res.statusCode, body: Buffer.concat(chunks) });
        else reject(Object.assign(new Error(`WebDAV ${method}: HTTP ${res.statusCode}`), { status: res.statusCode }));
      });
    });
    req.on("error", reject);
    req.setTimeout(120000, () => req.destroy(new Error("WebDAV timeout")));
    if (body) req.write(body);
    req.end();
  });
}
async function ensureTarget(c) {
  if (c.target === "local") { await fs.mkdir(c.localPath, { recursive: true, mode: 0o700 }); return; }
  try { await webdav(c, "MKCOL"); }
  catch (error) { if (![405].includes(error.status)) throw error; }
}
async function readTarget(c, filename) {
  if (c.target === "local") return fs.readFile(path.join(c.localPath, filename));
  return (await webdav(c, "GET", filename)).body;
}
async function writeTarget(c, filename, body) {
  if (c.target === "local") { const target = path.join(c.localPath, filename); await fs.writeFile(`${target}.tmp`, body, { mode: 0o600 }); await fs.rename(`${target}.tmp`, target); return; }
  await webdav(c, "PUT", filename, body);
}
async function deleteTarget(c, filename) {
  if (c.target === "local") return fs.unlink(path.join(c.localPath, filename));
  await webdav(c, "DELETE", filename);
}
async function index(c) {
  try { const items = JSON.parse((await readTarget(c, "index.json")).toString("utf8")); if (!Array.isArray(items)) throw new Error("Ungültiger Backup-Index"); return items; }
  catch (error) { if (error.code === "ENOENT" || error.status === 404) return []; throw error; }
}
function digest(data) { return createHash("sha256").update(data).digest("hex"); }
async function encryptedArchive(c, directory) {
  const tarFile = path.join(directory, "snapshot.tar");
  const archive = path.join(directory, "snapshot.tar.gpg");
  const sources = [".wrangler/wiki-content", ".wrangler/wiki-users.json", ".wrangler/wiki-devices.json", ".wrangler/site-settings.json", ".wrangler/wiki-uploads"];
  for (const file of [".wrangler/wiki-articles.json", ".env"]) if (existsSync(path.join(app, file))) sources.push(file);
  for (const file of sources.slice(0, 5)) if (!existsSync(path.join(app, file))) throw new Error(`Pflichtdaten fehlen: ${file}`);
  run("tar", ["-cf", tarFile, ...sources]);
  run("gpg", ["--batch", "--yes", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--symmetric", "--cipher-algo", "AES256", "--output", archive, tarFile], { input: `${c.passphrase}\n` });
  return fs.readFile(archive);
}
async function validate(c, encrypted, expectedHash, directory) {
  if (digest(encrypted) !== expectedHash) throw new Error("SHA-256-Prüfsumme stimmt nicht");
  const encryptedFile = path.join(directory, "download.tar.gpg");
  const tarFile = path.join(directory, "download.tar");
  await fs.writeFile(encryptedFile, encrypted, { mode: 0o600 });
  run("gpg", ["--batch", "--yes", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--decrypt", "--output", tarFile, encryptedFile], { input: `${c.passphrase}\n` });
  const entries = run("tar", ["-tf", tarFile]).trim().split("\n");
  if (entries.some((entry) => entry.startsWith("/") || entry.split("/").includes("..") || !(entry === ".env" || entry.startsWith(".wrangler/")))) throw new Error("Unsicherer Archivpfad");
  if (![".wrangler/wiki-users.json", ".wrangler/wiki-devices.json"].every((entry) => entries.includes(entry)) || !entries.some((entry) => entry.startsWith(".wrangler/wiki-content/public/")) || !entries.some((entry) => entry.startsWith(".wrangler/wiki-content/private/"))) throw new Error("Archiv ist unvollständig");
  const extract = path.join(directory, "restore-check");
  await fs.mkdir(extract);
  run("tar", ["-xf", tarFile, "-C", extract]);
  for (const file of ["wiki-users.json", "wiki-devices.json", "site-settings.json"]) JSON.parse(await fs.readFile(path.join(extract, ".wrangler", file), "utf8"));
  return extract;
}
async function backup(c) {
  await ensureTarget(c);
  const directory = await fs.mkdtemp(path.join(process.env.WIKI_BACKUP_ALLOW_LOCAL_TEST === "1" ? os.tmpdir() : "/dev/shm", "wiki-backup-"));
  try {
    const encrypted = await encryptedArchive(c, directory);
    const id = `wiki-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}-${digest(encrypted).slice(0, 8)}.tar.gpg`;
    const item = { id, createdAt: new Date().toISOString(), sha256: digest(encrypted), bytes: encrypted.length };
    await writeTarget(c, id, encrypted);
    const roundtrip = await readTarget(c, id);
    await validate(c, roundtrip, item.sha256, directory);
    const items = [item, ...(await index(c)).filter((entry) => entry.id !== id)];
    await writeTarget(c, "index.json", Buffer.from(`${JSON.stringify(items, null, 2)}\n`));
    const cutoff = Date.now() - c.retentionDays * 86400000;
    const expired = items.filter((entry) => Date.parse(entry.createdAt) < cutoff && entry.id !== id && namePattern.test(entry.id));
    for (const entry of expired) await deleteTarget(c, entry.id);
    if (expired.length) await writeTarget(c, "index.json", Buffer.from(`${JSON.stringify(items.filter((entry) => !expired.includes(entry)), null, 2)}\n`));
    await status({ result: "Erfolgreich", message: "Archiv übertragen, heruntergeladen, entschlüsselt und geprüft.", target: c.target, latest: id, verifiedAt: new Date().toISOString() });
    return id;
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function verify(c, selected) {
  const items = await index(c);
  const item = selected ? items.find((entry) => entry.id === selected) : items[0];
  if (!item || !namePattern.test(item.id)) throw new Error("Kein gültiges Archiv gefunden");
  const directory = await fs.mkdtemp(path.join(process.env.WIKI_BACKUP_ALLOW_LOCAL_TEST === "1" ? os.tmpdir() : "/dev/shm", "wiki-restore-test-"));
  try {
    await validate(c, await readTarget(c, item.id), item.sha256, directory);
    await status({ result: "Erfolgreich", message: "Wiederherstellung isoliert getestet; Produktivdaten unverändert.", target: c.target, latest: item.id, verifiedAt: new Date().toISOString() });
    return item.id;
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function restoreTo(c, selected, destination) {
  if (!selected || !namePattern.test(selected) || !path.isAbsolute(destination) || destination === "/") throw new Error("Archiv-ID und leerer absoluter Zielordner erforderlich");
  const items = await index(c);
  const item = items.find((entry) => entry.id === selected);
  if (!item) throw new Error("Archiv nicht im Backup-Index");
  const directory = await fs.mkdtemp(path.join(process.env.WIKI_BACKUP_ALLOW_LOCAL_TEST === "1" ? os.tmpdir() : "/dev/shm", "wiki-restore-"));
  try {
    const extracted = await validate(c, await readTarget(c, item.id), item.sha256, directory);
    await fs.mkdir(destination, { recursive: true, mode: 0o700 });
    if ((await fs.readdir(destination)).length) throw new Error("Restore-Ziel ist nicht leer");
    await fs.cp(path.join(extracted, ".wrangler"), path.join(destination, ".wrangler"), { recursive: true });
    if (existsSync(path.join(extracted, ".env"))) await fs.copyFile(path.join(extracted, ".env"), path.join(destination, ".env"));
    await status({ result: "Erfolgreich", message: `Archiv ${item.id} nach ${destination} wiederhergestellt; Produktivdaten unverändert.`, verifiedAt: new Date().toISOString() });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function processQueue(c) {
  let request;
  try { request = JSON.parse(await fs.readFile(requestFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  if (!request.id || !["backup", "verify"].includes(request.action)) throw new Error("Ungültiger Auftrag");
  await fs.rename(requestFile, `${requestFile}.processing`);
  try { if (request.action === "backup") await backup(c); else await verify(c); }
  finally { await fs.rm(`${requestFile}.processing`, { force: true }); }
}
async function scheduled(c) {
  const latest = (await index(c))[0];
  const last = latest ? Date.parse(latest.createdAt) : NaN;
  if (Number.isFinite(last) && Date.now() - last < (c.intervalHours ?? 24) * 3600000) return;
  console.log(await backup(c));
}
async function main() {
  const command = process.argv[2] || "backup";
  if (!existsSync(configFile) && ["backup", "queue", "scheduled"].includes(command)) return;
  if (["backup", "queue", "scheduled"].includes(command) && !JSON.parse(await fs.readFile(configFile, "utf8")).enabled) return;
  const c = await config();
  if (command === "backup") console.log(await backup(c));
  else if (command === "verify") console.log(await verify(c, process.argv[3]));
  else if (command === "restore-to") await restoreTo(c, process.argv[3], process.argv[4]);
  else if (command === "queue") await processQueue(c);
  else if (command === "scheduled") await scheduled(c);
  else throw new Error("Aufruf: wiki-backup.mjs backup|scheduled|verify [Archiv-ID]|restore-to ARCHIV-ID LEERES-ZIEL|queue");
}
main().catch(async (error) => { console.error(error.message); try { await status({ result: "Fehler", message: error.message }); } catch { /* status unavailable */ } process.exitCode = 1; });
