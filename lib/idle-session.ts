import { createHash } from "node:crypto";
import { mkdir, readdir, stat, unlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.join(process.cwd(), ".wrangler", "wiki-sessions");

function sessionFile(token: string) {
  return path.join(directory, `${createHash("sha256").update(token).digest("hex")}.session`);
}

export async function createIdleSession(token: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const old = Date.now() - 8 * 60 * 60_000;
  for (const name of await readdir(directory)) {
    if (!/^[a-f0-9]{64}\.session$/.test(name)) continue;
    const file = path.join(directory, name);
    try { if ((await stat(file)).mtimeMs < old) await unlink(file); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  await writeFile(sessionFile(token), "", { flag: "wx", mode: 0o600 });
}

export async function remainingIdleSeconds(token: string, timeoutMinutes: number) {
  try {
    const info = await stat(sessionFile(token));
    const seconds = Math.ceil((info.mtimeMs + timeoutMinutes * 60_000 - Date.now()) / 1000);
    if (seconds <= 0) { await revokeIdleSession(token); return 0; }
    return seconds;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

export async function touchIdleSession(token: string, timeoutMinutes: number) {
  if (await remainingIdleSeconds(token, timeoutMinutes) <= 0) return 0;
  const now = new Date();
  try { await utimes(sessionFile(token), now, now); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
  return timeoutMinutes * 60;
}

export async function revokeIdleSession(token: string) {
  try { await unlink(sessionFile(token)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
