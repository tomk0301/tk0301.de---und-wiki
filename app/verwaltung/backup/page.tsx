import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import { requireRole } from "../../../lib/current-user";
import { backupStatusFile, readBackupConfig } from "../../../lib/backup-config";
import { requestBackupAction, saveBackupConfigAction } from "./actions";

export const metadata: Metadata = { title: "Backup & Restore" };
export const dynamic = "force-dynamic";

type Status = { result?: string; at?: string; message?: string; target?: string; latest?: string; verifiedAt?: string };
export default async function BackupPage({ searchParams }: { searchParams: Promise<{ saved?: string; queued?: string }> }) {
  await requireRole("admin");
  const config = await readBackupConfig();
  let status: Status = {};
  try { status = JSON.parse(await readFile(backupStatusFile, "utf8")); } catch { /* noch kein Lauf */ }
  const notice = await searchParams;
  return <main className="subpage"><header className="site-header"><Link className="brand" href="/verwaltung"><span className="brand-mark">TK</span><span>Backup & Restore</span></Link><nav><Link href="/verwaltung">Administration</Link><Link href="/wiki">Wiki</Link></nav></header>
    <div className="page-shell editor-shell"><div className="eyebrow">Nur für Administratoren</div><h1>Wiki-Datensicherung</h1>
      <p>Öffentliche und private Artikel, Uploads, Benutzer, Geräte und Einstellungen werden gemeinsam verschlüsselt gesichert. Das Ziel und der WebDAV-Benutzer sind unabhängig von SCC.</p>
      {notice.saved && <p className="success">Konfiguration gespeichert.</p>}{notice.queued && <p className="success">Auftrag vorgemerkt. Der Sicherungsdienst bearbeitet ihn in wenigen Minuten.</p>}
      <section className="admin-panel"><article className="stat"><span className="card-kicker">Letzter Lauf</span><strong>{status.result || "Noch keiner"}</strong><small>{status.at || ""}</small></article><article className="stat"><span className="card-kicker">Letzte Prüfung</span><strong>{status.verifiedAt ? "Erfolgreich" : "Ausstehend"}</strong><small>{status.verifiedAt || ""}</small></article></section>
      {status.message && <p role="status">{status.message}</p>}{status.latest && <p>Letztes Archiv: <code>{status.latest}</code></p>}
      <form className="editor-form" action={saveBackupConfigAction}>
        <label className="field"><span>Sicherungsziel</span><select name="target" defaultValue={config?.target || "webdav"}><option value="webdav">WebDAV / NAS</option><option value="local">Lokaler oder gemounteter Pfad</option></select></label>
        <label className="field"><span>WebDAV-Zielordner (vollständige HTTPS-URL)</span><input name="webdavUrl" type="url" defaultValue={config?.webdavUrl || ""} placeholder="https://nas.example:5006/TK0301-Wiki" /></label>
        <label className="field"><span>Eigener Wiki-NAS-Benutzer</span><input name="username" defaultValue={config?.username || ""} autoComplete="off" /></label>
        <label className="field"><span>WebDAV-Kennwort</span><input name="password" type="password" placeholder={config?.password ? "Gespeichert – leer lassen zum Beibehalten" : ""} autoComplete="new-password" /></label>
        <label className="field"><span>Alternativer lokaler Zielpfad</span><input name="localPath" defaultValue={config?.localPath || ""} placeholder="/var/backups/tk0301-wiki" /></label>
        <label className="field"><span>Verschlüsselungsschlüssel</span><input name="passphrase" type="password" placeholder={config?.passphrase ? "Gespeichert – leer lassen zum Beibehalten" : "Mindestens 24 Zeichen"} autoComplete="new-password" /><small className="field-help">Für die Wiederherstellung nach einem Serverausfall den Schlüssel außerhalb des Servers sicher aufbewahren.</small></label>
        <label className="field"><span>Aufbewahrung (Tage)</span><input name="retentionDays" type="number" min="1" max="3650" defaultValue={config?.retentionDays || 90} required /></label>
        <label><input type="checkbox" name="allowSelfSigned" defaultChecked={config?.allowSelfSigned || false} /> Selbstsigniertes NAS-Zertifikat zulassen</label>
        <label className="field"><span>SHA-256-Zertifikatsfingerabdruck (bei selbstsigniertem Zertifikat)</span><input name="certificateFingerprint" defaultValue={config?.certificateFingerprint || ""} placeholder="64 Hex-Zeichen" /><small className="field-help">Schützt trotz selbstsigniertem Zertifikat vor einem ausgetauschten NAS-Zertifikat.</small></label>
        <label><input type="checkbox" name="enabled" defaultChecked={config?.enabled || false} /> Automatische Sicherung aktiv</label>
        <div className="editor-actions"><button className="button" type="submit">Konfiguration speichern</button></div>
      </form>
      <form action={requestBackupAction} className="editor-actions"><button className="button" name="action" value="backup" disabled={!config?.enabled}>Jetzt sichern</button><button className="button" name="action" value="verify" disabled={!config?.enabled}>Wiederherstellung testen</button></form>
      <p className="field-help">Der Test lädt das neueste Archiv herunter, prüft die Prüfsumme und entschlüsselt es in ein isoliertes Verzeichnis. Eine produktive Wiederherstellung erfolgt bewusst nur per SSH nach zusätzlicher Bestätigung und Vorsicherung.</p>
    </div></main>;
}
