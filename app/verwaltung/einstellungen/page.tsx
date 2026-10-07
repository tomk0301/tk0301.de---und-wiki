import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "../../../lib/current-user";
import { getSiteSettings } from "../../../lib/site-settings";
import { saveSettingsAction } from "./actions";
import { SiteHeader } from "../../site-header";
export const metadata: Metadata = { title: "Konfiguration" };
export const dynamic = "force-dynamic";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole("admin"); const settings = await getSiteSettings(); const saved = (await searchParams).saved;
  return <main className="subpage"><SiteHeader title="Konfiguration" /><div className="page-shell editor-shell"><div className="eyebrow">Wiki-Startseite und Sicherheit</div><h1>Konfiguration</h1>{saved && <p className="success">Die Einstellungen wurden gespeichert.</p>}<form className="editor-form" action={saveSettingsAction}><label className="field"><span>Absatz 1 · Kleiner Hinweis</span><input name="wikiEyebrow" defaultValue={settings.wikiEyebrow} maxLength={100} required /></label><label className="field"><span>Absatz 2 · Hauptüberschrift</span><textarea name="wikiTitle" defaultValue={settings.wikiTitle} rows={2} maxLength={200} required /><small className="field-help">Zeilenumbruch wird übernommen.</small></label><label className="field"><span>Absatz 3 · Beschreibung</span><textarea name="wikiIntro" defaultValue={settings.wikiIntro} rows={4} maxLength={500} required /></label><label className="field"><span>Automatische Abmeldung nach Inaktivität (Minuten)</span><input name="idleTimeoutMinutes" type="number" min="1" max="480" step="1" defaultValue={settings.idleTimeoutMinutes} required /><small className="field-help">30 Sekunden vor Ablauf erscheint eine Warnung. Die Sitzung endet spätestens nach acht Stunden.</small></label><div className="editor-actions"><button className="button" type="submit">Konfiguration speichern</button><Link className="text-link" href="/verwaltung">Abbrechen</Link></div></form></div></main>;
}
