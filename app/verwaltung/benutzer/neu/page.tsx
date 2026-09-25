import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "../../../../lib/current-user";
import { createUserAction } from "../actions";
import { SiteHeader } from "../../../site-header";

export const metadata: Metadata = { title: "Benutzer anlegen" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  username: "Der Benutzername muss mindestens drei gültige Zeichen enthalten.",
  exists: "Dieser Benutzername ist bereits vergeben.",
  password: "Das Passwort muss mindestens 14 Zeichen lang sein.",
  validation: "Bitte alle Pflichtfelder vollständig ausfüllen.",
  unknown: "Der Benutzer konnte nicht angelegt werden.",
};

export default async function NewUserPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  const error = (await searchParams).error;
  return (
    <main className="subpage">
      <SiteHeader title="Neuer Benutzer" />
      <div className="page-shell editor-shell">
        <div className="eyebrow">Zugriff einrichten</div>
        <h1>Benutzer anlegen</h1>
        {error && <p className="error">{messages[error] || messages.unknown}</p>}
        <form className="editor-form editor-grid" action={createUserAction}>
          <label className="field"><span>Benutzername</span><input name="username" minLength={3} maxLength={48} pattern="[A-Za-z0-9._-]+" autoComplete="off" required /></label>
          <label className="field"><span>Anzeigename</span><input name="displayName" maxLength={100} required /></label>
          <label className="field"><span>Rolle</span><select name="role" defaultValue="reader"><option value="reader">Leser</option><option value="admin">Administrator</option></select></label>
          <label className="field"><span>Startpasswort</span><input type="password" name="password" minLength={14} autoComplete="new-password" required /><small className="field-help">Mindestens 14 Zeichen. Der Benutzer sollte es nach der Einrichtung ändern lassen.</small></label>
          <div className="editor-actions field-wide"><button className="button" type="submit">Benutzer anlegen</button><Link className="text-link" href="/verwaltung/benutzer">Abbrechen</Link></div>
        </form>
      </div>
    </main>
  );
}
