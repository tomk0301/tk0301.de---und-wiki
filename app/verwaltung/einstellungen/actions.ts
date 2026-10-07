"use server";
import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/current-user";
import { getSiteSettings, saveSiteSettings } from "../../../lib/site-settings";
export async function saveSettingsAction(formData: FormData) {
  await requireRole("admin");
  const value = (name: string, max: number) => String(formData.get(name) || "").trim().slice(0, max);
  const minutes = Number(formData.get("idleTimeoutMinutes"));
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) throw new Error("Inaktivitätszeit muss zwischen 1 und 480 Minuten liegen");
  const current = await getSiteSettings();
  await saveSiteSettings({ ...current, wikiEyebrow: value("wikiEyebrow", 100), wikiTitle: value("wikiTitle", 200), wikiIntro: value("wikiIntro", 500), idleTimeoutMinutes: minutes });
  redirect("/verwaltung/einstellungen?saved=1");
}
