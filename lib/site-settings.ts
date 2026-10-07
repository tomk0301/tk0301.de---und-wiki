import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type SiteSettings = { wikiEyebrow: string; wikiTitle: string; wikiIntro: string; idleTimeoutMinutes: number };
const defaults: SiteSettings = { wikiEyebrow: "Geschützte Wissenssammlung", wikiTitle: "Kurz erklärt.\nDauerhaft notiert.", wikiIntro: "Technische Anleitungen, Notizen und Lösungen aus der Praxis. Artikel sind für angemeldete Benutzer lesbar.", idleTimeoutMinutes: 30 };
const file = path.join(process.cwd(), ".wrangler", "site-settings.json");
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = { ...defaults, ...JSON.parse(await readFile(file, "utf8")) };
    if (!Number.isInteger(settings.idleTimeoutMinutes) || settings.idleTimeoutMinutes < 1 || settings.idleTimeoutMinutes > 480) settings.idleTimeoutMinutes = defaults.idleTimeoutMinutes;
    return settings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await saveSiteSettings(defaults); return defaults;
  }
}
export async function saveSiteSettings(settings: SiteSettings) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, file);
}
