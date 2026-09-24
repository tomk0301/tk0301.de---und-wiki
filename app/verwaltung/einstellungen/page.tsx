import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "../../../lib/current-user";
import { getSiteSettings } from "../../../lib/site-settings";
import { saveSettingsAction } from "./actions";
export const metadata: Metadata = { title: "Konfiguration" };
export const dynamic = "force-dynamic";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole("admin"); const settings = await getSiteSettings(); const saved = (await searchParams).saved;
  return <main className="subpage"><header className="site-header"><Link className="brand" href="/verwaltung"><span className="brand-mark">TK</span><span>Konfiguration</span></Link><nav><Link href="/verwaltung/benutzer">Benutzer konfigurieren</Link><Link href="/verwaltung/articles">Artikel verwalten</Link><Link href="/wiki">Wiki</Link></nav></header><div className="page-shell editor-shell"><div className="eyebrow">Wiki-Startseite</div><h1>Texte bearbeiten</h1>{saved && <p className="success">Die Texte wurden gespeichert.</p>}<form className="editor-form" action={saveSettingsAction}><label className="field"><span>Absatz 1 · Kleiner Hinweis</span><input name="wikiEyebrow" defaultValue={settings.wikiEyebrow} maxLength={100} required /></label><label className="field"><span>Absatz 2 · Hauptüberschrift</span><textarea name="wikiTitle" defaultValue={settings.wikiTitle} rows={2} maxLength={200} required /><small className="field-help">Zeilenumbruch wird übernommen.</small></label><label className="field"><span>Absatz 3 · Beschreibung</span><textarea name="wikiIntro" defaultValue={settings.wikiIntro} rows={4} maxLength={500} required /></label><div className="editor-actions"><button className="button" type="submit">Texte speichern</button><Link className="text-link" href="/verwaltung">Abbrechen</Link></div></form></div></main>;
}
