import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type BackupConfig = {
  target: "webdav" | "local";
  webdavUrl: string;
  username: string;
  password: string;
  localPath: string;
  passphrase: string;
  retentionDays: number;
  intervalHours: number;
  allowSelfSigned: boolean;
  certificateFingerprint: string;
  enabled: boolean;
};

export const backupConfigFile = path.join(process.cwd(), ".wrangler", "wiki-backup-config.json");
export const backupStatusFile = path.join(process.cwd(), ".wrangler", "wiki-backup-status.json");
export const backupRequestFile = path.join(process.cwd(), ".wrangler", "wiki-backup-request.json");

export async function readBackupConfig(): Promise<BackupConfig | null> {
  try { return JSON.parse(await readFile(backupConfigFile, "utf8")) as BackupConfig; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export async function writeBackupConfig(config: BackupConfig) {
  await mkdir(path.dirname(backupConfigFile), { recursive: true, mode: 0o700 });
  const temporary = `${backupConfigFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config)}\n`, { mode: 0o600 });
  await rename(temporary, backupConfigFile);
}
