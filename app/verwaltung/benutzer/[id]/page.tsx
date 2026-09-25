import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "../../../../lib/current-user";
import { getUserById } from "../../../../lib/users";
import { deleteUserAction, revokeDeviceAction, updateUserAction } from "../actions";
import { listDevices } from "../../../../lib/devices";
import { listArticles } from "../../../../lib/wiki";
import { SiteHeader } from "../../../site-header";

export const metadata: Metadata = { title: "Benutzer bearbeiten" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  password: "Das neue Passwort muss mindestens 14 Zeichen lang sein.",
  self: "Das eigene Administratorkonto kann nicht gesperrt oder zum Leser herabgestuft werden.",
  "last-admin": "Der letzte aktive Administrator kann nicht entfernt oder herabgestuft werden.",
  confirm: "Bitte das Löschen zuerst bestätigen.",
  validation: "Bitte alle Pflichtfelder vollständig ausfüllen.",
  unknown: "Die Änderung konnte nicht gespeichert werden.",
};

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; setup?: string }>;
}) {
  await requireRole("admin");
  const user = await getUserById((await params).id);
  if (!user) notFound();
  const devices = await listDevices(user.id);
  const articles = await listArticles(true);
  const query = await searchParams;
  const showSetup = query.setup === "created" || query.setup === "reset";
  const issuer = encodeURIComponent("TK0301 Wiki");
  const label = encodeURIComponent(`TK0301 Wiki:${user.username}`);
  const otpUri = `otpauth://totp/${label}?secret=${user.totpSecret}&issuer=${issuer}&digits=6&period=30`;
  return (
    <main className="subpage">
      <SiteHeader title="Benutzer bearbeiten" />
      <div className="page-shell editor-shell">
        <div className="eyebrow">{user.role === "admin" ? "Administrator" : "Leser"} · {user.active ? "aktiv" : "gesperrt"}</div>
        <h1>{user.displayName}</h1>
        {query.saved && <p className="success">Die Änderungen wurden gespeichert.</p>}
        {query.error && <p className="error">{errors[query.error] || errors.unknown}</p>}
        {showSetup && (
          <section className="totp-setup">
            <div className="eyebrow">Authenticator einrichten</div>
            <h2>Persönlichen 2FA-Schlüssel jetzt speichern</h2>
            <p>In der Authenticator-App ein zeitbasiertes Konto mit 6 Stellen und 30 Sekunden anlegen.</p>
            <code>{user.totpSecret}</code>
            <a className="text-link" href={otpUri}>Direkt in Authenticator-App öffnen</a>
            <p className="field-help">Dieser Schlüssel wird nach Verlassen der Seite nicht erneut angezeigt.</p>
          </section>
        )}
        <form className="editor-form editor-grid" action={updateUserAction}>
          <input type="hidden" name="id" value={user.id} />
          <label className="field"><span>Benutzername</span><input value={user.username} disabled /><small className="field-help">Der Benutzername kann nicht geändert werden.</small></label>
          <label className="field"><span>Anzeigename</span><input name="displayName" defaultValue={user.displayName} maxLength={100} required /></label>
          <label className="field"><span>Rolle</span><select name="role" defaultValue={user.role}><option value="reader">Leser</option><option value="admin">Administrator</option></select></label>
          <label className="field"><span>Neues Passwort</span><input type="password" name="password" minLength={14} autoComplete="new-password" /><small className="field-help">Leer lassen, um das aktuelle Passwort zu behalten.</small></label>
          <label className="confirm-check field-wide"><input type="checkbox" name="active" value="yes" defaultChecked={user.active} /> Benutzer darf sich anmelden</label>
          <label className="confirm-check field-wide"><input type="checkbox" name="resetTotp" value="yes" /> Neuen 2FA-Schlüssel erzeugen</label>
          {user.role === "reader" && <fieldset className="field-wide"><legend>Leserechte für Artikel</legend>{articles.map((article) => <label className="confirm-check" key={article.id}><input type="checkbox" name="allowedArticleIds" value={article.id} defaultChecked={user.allowedArticleIds?.includes(article.id)} /> {article.title}</label>)}</fieldset>}
          <div className="editor-actions field-wide"><button className="button" type="submit">Änderungen speichern</button><Link className="text-link" href="/verwaltung/benutzer">Zurück</Link></div>
        </form>
        <section className="image-upload"><h2>Vertrauenswürdige Geräte</h2><p className="field-help">Geräte, auf denen die 2FA-Abfrage für 28 Tage übersprungen wird.</p>{devices.length === 0 && <p>Keine gespeicherten Geräte.</p>}{devices.map((device) => <div className="device-row" key={device.id}><div><strong>{device.name}</strong><small>Zuletzt genutzt: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(device.lastUsedAt))}<br />Gültig bis: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(device.expiresAt))}</small></div><form action={revokeDeviceAction}><input type="hidden" name="deviceId" value={device.id} /><input type="hidden" name="userId" value={user.id} /><button className="button button-danger button-small" type="submit">Widerrufen</button></form></div>)}</section>
        <section className="danger-zone">
          <div><h2>Benutzer löschen</h2><p>Der Benutzer verliert sofort dauerhaft den Zugriff.</p></div>
          <form action={deleteUserAction}>
            <input type="hidden" name="id" value={user.id} />
            <label className="confirm-check"><input type="checkbox" name="confirm" value="yes" required /> Löschen bestätigen</label>
            <button className="button button-danger" type="submit">Benutzer endgültig löschen</button>
          </form>
        </section>
      </div>
    </main>
  );
}
