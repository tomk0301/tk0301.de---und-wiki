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
  if (target !== "webdav") redirect("/verwaltung/backup?error=target");
  const webdavUrl = value("webdavUrl");
  if (!/^https:\/\//i.test(webdavUrl) || !value("username")) redirect("/verwaltung/backup?error=webdav");
  const retentionDays = Number(value("retentionDays"));
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) redirect("/verwaltung/backup?error=retention");
  const intervalHours = Number(value("intervalHours"));
  if (![6, 12, 24, 48, 168].includes(intervalHours)) redirect("/verwaltung/backup?error=interval");
  const password = value("password") || current?.password || "";
  const passphrase = value("passphrase") || current?.passphrase || "";
  const certificateFingerprint = (value("certificateFingerprint") || current?.certificateFingerprint || "").replace(/:/g, "").toUpperCase();
  if (formData.has("allowSelfSigned") && !/^[A-F0-9]{64}$/.test(certificateFingerprint)) redirect("/verwaltung/backup?error=fingerprint");
  if (!password) redirect("/verwaltung/backup?error=password");
  if (passphrase.length < 24) redirect("/verwaltung/backup?error=passphrase");
  try {
    await writeBackupConfig({ target, webdavUrl, username: value("username"), password, localPath: "",
      passphrase, retentionDays, intervalHours, allowSelfSigned: formData.has("allowSelfSigned"), certificateFingerprint, enabled: formData.has("enabled") });
  } catch (error) {
    console.error("Wiki-Backup-Konfiguration konnte nicht gespeichert werden", error);
    redirect("/verwaltung/backup?error=storage");
  }
  redirect("/verwaltung/backup?saved=1");
}

export async function requestBackupAction(formData: FormData) {
  await requireRole("admin");
  const action = String(formData.get("action") || "");
  if (action !== "backup" && action !== "verify") redirect("/verwaltung/backup?error=action");
  const config = await readBackupConfig();
  if (!config?.enabled) redirect("/verwaltung/backup?error=disabled");
  try {
    await writeFile(backupRequestFile, `${JSON.stringify({ id: randomUUID(), action, createdAt: new Date().toISOString() })}\n`, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") redirect("/verwaltung/backup?error=queued");
    console.error("Wiki-Backup-Auftrag konnte nicht vorgemerkt werden", error);
    redirect("/verwaltung/backup?error=queue-storage");
  }
  redirect("/verwaltung/backup?queued=1");
}
