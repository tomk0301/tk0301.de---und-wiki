"use server";
import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/current-user";
import { saveSiteSettings } from "../../../lib/site-settings";
export async function saveSettingsAction(formData: FormData) {
  await requireRole("admin");
  const value = (name: string, max: number) => String(formData.get(name) || "").trim().slice(0, max);
  await saveSiteSettings({ wikiEyebrow: value("wikiEyebrow", 100), wikiTitle: value("wikiTitle", 200), wikiIntro: value("wikiIntro", 500) });
  redirect("/verwaltung/einstellungen?saved=1");
}
