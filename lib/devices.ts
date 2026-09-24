import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
export type Device = { id: string; userId: string; name: string; createdAt: string; lastUsedAt: string; expiresAt: string };
const file = path.join(process.cwd(), ".wrangler", "wiki-devices.json");
async function all(): Promise<Device[]> { try { return JSON.parse(await readFile(file, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; return []; } }
async function save(items: Device[]) { await mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await writeFile(tmp, JSON.stringify(items, null, 2), { mode: 0o600 }); await rename(tmp, file); }
export async function createDevice(userId: string) { const now = new Date(); const device: Device = { id: randomUUID(), userId, name: `Gerät · ${now.toLocaleDateString("de-DE")}`, createdAt: now.toISOString(), lastUsedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 28 * 86400000).toISOString() }; const items = await all(); items.push(device); await save(items); return device; }
export async function getDevice(id: string, userId: string) { return (await all()).find((d) => d.id === id && d.userId === userId && new Date(d.expiresAt) > new Date()); }
export async function listDevices(userId: string) { return (await all()).filter((d) => d.userId === userId).sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)); }
export async function revokeDevice(id: string, userId: string) { await save((await all()).filter((d) => !(d.id === id && d.userId === userId))); }
