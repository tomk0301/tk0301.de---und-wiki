"use server";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/current-user";
import { backupRequestFile, readBackupConfig, writeBackupConfig } from "../../../lib/backup-config";

export async function saveBackupConfigAction(formData: FormData) {
  await requireRole("admin");
  const current = await readBackupConfig();
  const value = (name: string) => String(formData.get(name) || "").trim();
  const target = value("target");
  if (target !== "webdav") throw new Error("Nur NAS/WebDAV ist als Sicherungsziel zulässig");
  const webdavUrl = value("webdavUrl");
  if (!/^https:\/\//i.test(webdavUrl) || !value("username")) throw new Error("WebDAV benötigt HTTPS-URL und eigenen Wiki-Benutzer");
  const retentionDays = Number(value("retentionDays"));
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) throw new Error("Aufbewahrung: 1–3650 Tage");
  const intervalHours = Number(value("intervalHours"));
  if (![6, 12, 24, 48, 168].includes(intervalHours)) throw new Error("Ungültiger Sicherungsrhythmus");
  const password = value("password") || current?.password || "";
  const passphrase = value("passphrase") || current?.passphrase || "";
  const certificateFingerprint = value("certificateFingerprint").replace(/:/g, "").toUpperCase();
  if (formData.has("allowSelfSigned") && !/^[A-F0-9]{64}$/.test(certificateFingerprint)) throw new Error("Bei selbstsigniertem Zertifikat ist der SHA-256-Fingerabdruck erforderlich");
  if (!password) throw new Error("WebDAV-Kennwort fehlt");
  if (passphrase.length < 24) throw new Error("Sicherungsschlüssel muss mindestens 24 Zeichen lang sein");
  await writeBackupConfig({ target, webdavUrl, username: value("username"), password, localPath: "",
    passphrase, retentionDays, intervalHours, allowSelfSigned: formData.has("allowSelfSigned"), certificateFingerprint, enabled: formData.has("enabled") });
  redirect("/verwaltung/backup?saved=1");
}

export async function requestBackupAction(formData: FormData) {
  await requireRole("admin");
  const action = String(formData.get("action") || "");
  if (action !== "backup" && action !== "verify") throw new Error("Ungültige Aktion");
  const config = await readBackupConfig();
  if (!config?.enabled) throw new Error("Sicherung ist nicht aktiviert");
  await writeFile(backupRequestFile, `${JSON.stringify({ id: randomUUID(), action, createdAt: new Date().toISOString() })}\n`, { flag: "wx", mode: 0o600 });
  redirect("/verwaltung/backup?queued=1");
}
