import type { Metadata } from "next";
import Link from "next/link";
import { login } from "./actions";
import { getCurrentUser } from "../../lib/current-user";
import { redirect } from "next/navigation";
import { secureUrl } from "../../lib/secure-url";

export const metadata: Metadata = { title: "Anmeldung" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect(await secureUrl("/"));
  const error = (await searchParams).error;
  return (
    <main className="subpage">
      <header className="site-header">
        <div className="brand"><span className="brand-mark">TK</span><span>tk0301.site</span></div>
        <nav><Link href="/">Abbrechen</Link></nav>
      </header>
      <div className="login-wrap">
        <section className="login-card">
          <div className="eyebrow">Geschützter Bereich</div>
          <h1>Sicher anmelden</h1>
          <p>Bitte Benutzername, Passwort und aktuellen Code der Authenticator-App eingeben.</p>
          {error && (
            <p className="error" role="alert">
              {error === "rate"
                ? "Zu viele Anmeldeversuche. Bitte 15 Minuten warten."
                : "Benutzername, Passwort oder Einmalcode ist nicht korrekt."}
            </p>
          )}
          <form action={login}>
            <label className="field">
              Benutzername
              <input name="username" type="text" autoComplete="username" minLength={3} maxLength={48} required />
            </label>
            <label className="field">
              Passwort
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <label className="field">
              6-stelliger Einmalcode
              <input name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="Nur erforderlich, wenn Gerät nicht gemerkt ist" />
            </label>
            <label className="remember-device"><input name="rememberDevice" type="checkbox" value="yes" defaultChecked /> Dieses Gerät 28 Tage merken</label>
            <button className="button" type="submit">Sicher anmelden</button>
          </form>
          <p className="security-note">Die Sitzung endet automatisch nach acht Stunden.</p>
        </section>
      </div>
    </main>
  );
}
