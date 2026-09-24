import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "../../../lib/current-user";
import { listUsers } from "../../../lib/users";
import { logout } from "../../login/actions";

export const metadata: Metadata = { title: "Benutzerverwaltung" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireRole("admin");
  const users = await listUsers();
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/verwaltung"><span className="brand-mark">TK</span><span>Benutzerverwaltung</span></Link>
        <nav><Link href="/wiki">Hauptseite</Link><Link href="/verwaltung/articles">Artikel verwalten</Link><Link href="/verwaltung/einstellungen">Konfiguration</Link><Link href="/verwaltung/benutzer">Benutzer</Link><form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="page-shell">
        <section className="admin-title-row">
          <div><div className="eyebrow">Zugriff verwalten</div><h1>Benutzer</h1></div>
          <Link className="button" href="/verwaltung/benutzer/neu">Benutzer anlegen</Link>
        </section>
        {(await searchParams).deleted && <p className="success">Der Benutzer wurde gelöscht.</p>}
        <section className="admin-article-list">
          {users.map((user) => (
            <article className="admin-article-row" key={user.id}>
              <div>
                <div className="article-meta">
                  <span className={`status ${user.active ? "status-published" : "status-draft"}`}>{user.active ? "Aktiv" : "Gesperrt"}</span>
                  <span>{user.role === "admin" ? "Administrator" : "Leser"}</span>
                </div>
                <h2>{user.displayName}</h2>
                <p>Benutzername: <code>{user.username}</code></p>
              </div>
              <Link className="button button-small" href={`/verwaltung/benutzer/${user.id}`}>Bearbeiten</Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
