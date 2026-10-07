"use server";
import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/current-user";
import { getSiteSettings, saveSiteSettings } from "../../../lib/site-settings";
import { validDateTimeFormat, validTimeZone } from "../../../lib/date-time";
export async function saveSettingsAction(formData: FormData) {
  await requireRole("admin");
  const value = (name: string, max: number) => String(formData.get(name) || "").trim().slice(0, max);
  const minutes = Number(formData.get("idleTimeoutMinutes"));
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) redirect("/verwaltung/einstellungen?error=idle");
  const timeZone = value("timeZone", 100);
  const dateTimeFormat = value("dateTimeFormat", 10);
  if (!validTimeZone(timeZone)) redirect("/verwaltung/einstellungen?error=timezone");
  if (!validDateTimeFormat(dateTimeFormat)) redirect("/verwaltung/einstellungen?error=format");
  const current = await getSiteSettings();
  try {
    await saveSiteSettings({ ...current, wikiEyebrow: value("wikiEyebrow", 100), wikiTitle: value("wikiTitle", 200), wikiIntro: value("wikiIntro", 500), idleTimeoutMinutes: minutes, timeZone, dateTimeFormat });
  } catch (error) {
    console.error("Wiki-Konfiguration konnte nicht gespeichert werden", error);
    redirect("/verwaltung/einstellungen?error=storage");
  }
  redirect("/verwaltung/einstellungen?saved=1");
}
