import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "../../lib/wiki";
import { listUsers } from "../../lib/users";
import { requireRole } from "../../lib/current-user";
import { logout } from "../login/actions";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireRole("admin");
  const articles = await listArticles(true);
  const users = await listUsers();
  const published = articles.filter((article) => article.status === "published").length;
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">TK</span><span>Administration</span></Link>
        <nav><Link href="/wiki">Hauptseite</Link><Link href="/verwaltung/articles">Artikel verwalten</Link><Link href="/verwaltung/einstellungen">Konfiguration</Link><form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="page-shell">
        <section className="page-heading">
          <div className="eyebrow">Sicher angemeldet</div>
          <h1>Guten Tag, {user.displayName}.</h1>
          <p>Verwalte Wikiartikel, Veröffentlichungen und Benutzer im geschützten Bereich.</p>
        </section>
        <section className="admin-panel">
          <article className="stat"><span className="card-kicker">Wikiartikel</span><strong>{articles.length}</strong></article>
          <article className="stat"><span className="card-kicker">Veröffentlicht</span><strong>{published}</strong></article>
          <article className="stat"><span className="card-kicker">Benutzer</span><strong>{users.length}</strong></article>
        </section>
        <section className="admin-primary-action admin-secondary-action">
          <div><div className="eyebrow">Zugriff</div><h2>Benutzerverwaltung</h2><p>Leser und Administratoren anlegen, bearbeiten, sperren und mit 2FA ausstatten.</p></div>
          <Link className="button" href="/verwaltung/benutzer">Benutzer verwalten</Link>
        </section>
        <section className="admin-primary-action admin-secondary-action"><div><div className="eyebrow">Darstellung</div><h2>Konfiguration</h2><p>Einleitungstexte und Darstellung der Wiki-Übersicht bearbeiten.</p></div><Link className="button" href="/verwaltung/einstellungen">Konfiguration öffnen</Link></section>
      </div><footer className="site-footer">© Thomas Knebel · Version 02.08.2026</footer>
    </main>
  );
}
