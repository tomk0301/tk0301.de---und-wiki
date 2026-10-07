import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "../../../lib/current-user";
import { getSiteSettings } from "../../../lib/site-settings";
import { dateTimeFormats, formatDateTime } from "../../../lib/date-time";
import { saveSettingsAction } from "./actions";
import { SiteHeader } from "../../site-header";

export const metadata: Metadata = { title: "Konfiguration" };
export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  idle: "Die Inaktivitätszeit muss zwischen 1 und 480 Minuten liegen.",
  timezone: "Bitte eine gültige Zeitzone wählen, beispielsweise Europe/Berlin.",
  format: "Bitte ein gültiges Datums-/Zeitformat wählen.",
  storage: "Die Konfiguration konnte auf dem Server nicht gespeichert werden.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireRole("admin");
  const settings = await getSiteSettings();
  const notice = await searchParams;
  const timeZones = [...new Set([settings.timeZone, "UTC", ...Intl.supportedValuesOf("timeZone")])].sort();
  return <main className="subpage"><SiteHeader title="Konfiguration" />
    <div className="page-shell editor-shell"><div className="eyebrow">Wiki-Startseite, Zeitangaben und Sicherheit</div><h1>Konfiguration</h1>
      {notice.saved && <p className="success" role="status">Die Einstellungen wurden gespeichert.</p>}
      {notice.error && <p className="error" role="alert">{errors[notice.error] || "Die Einstellungen konnten nicht gespeichert werden."}</p>}
      <form className="editor-form" action={saveSettingsAction}>
        <label className="field"><span>Absatz 1 · Kleiner Hinweis</span><input name="wikiEyebrow" defaultValue={settings.wikiEyebrow} maxLength={100} required /></label>
        <label className="field"><span>Absatz 2 · Hauptüberschrift</span><textarea name="wikiTitle" defaultValue={settings.wikiTitle} rows={2} maxLength={200} required /><small className="field-help">Zeilenumbruch wird übernommen.</small></label>
        <label className="field"><span>Absatz 3 · Beschreibung</span><textarea name="wikiIntro" defaultValue={settings.wikiIntro} rows={4} maxLength={500} required /></label>
        <label className="field"><span>Zeitzone</span><select name="timeZone" defaultValue={settings.timeZone}>{timeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select><small className="field-help">Gilt für alle Zeitangaben im Wiki, einschließlich Sicherungen und Wiederherstellungstests. Sommer- und Winterzeit werden automatisch berücksichtigt.</small></label>
        <label className="field"><span>Datums-/Zeitformat</span><select name="dateTimeFormat" defaultValue={settings.dateTimeFormat}>{Object.entries(dateTimeFormats).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small className="field-help">Aktuelle Anzeige: {formatDateTime(new Date(), settings)} · {settings.timeZone}</small></label>
        <label className="field"><span>Automatische Abmeldung nach Inaktivität (Minuten)</span><input name="idleTimeoutMinutes" type="number" min="1" max="480" step="1" defaultValue={settings.idleTimeoutMinutes} required /><small className="field-help">30 Sekunden vor Ablauf erscheint eine Warnung. Die Sitzung endet spätestens nach acht Stunden.</small></label>
        <div className="editor-actions"><button className="button" type="submit">Konfiguration speichern</button><Link className="text-link" href="/verwaltung">Abbrechen</Link></div>
      </form>
    </div>
  </main>;
}
