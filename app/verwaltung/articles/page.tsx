import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "../../../lib/wiki";
import { requireRole } from "../../../lib/current-user";
import { logout } from "../../login/actions";
import { deleteArticleAction } from "./actions";
import { DeleteButton } from "./delete-button";

export const metadata: Metadata = { title: "Artikelpflege" };
export const dynamic = "force-dynamic";

export default async function ArticlesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  await requireRole("admin");
  const articles = await listArticles(true);
  const deleted = Boolean((await searchParams).deleted);
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/verwaltung"><span className="brand-mark">TK</span><span>Artikelpflege</span></Link>
        <nav><Link href="/wiki">Hauptseite</Link><Link href="/verwaltung/articles">Artikel verwalten</Link><Link href="/verwaltung/einstellungen">Konfiguration</Link><Link href="/verwaltung/benutzer">Benutzer</Link><form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="page-shell">
        <section className="admin-title-row">
          <div>
            <div className="eyebrow">Wiki verwalten</div>
            <h1>Artikel</h1>
          </div>
          <Link className="button" href="/verwaltung/articles/new">Artikel anlegen</Link>
        </section>
        {deleted && <p className="success" role="status">Der Artikel wurde gelöscht.</p>}
        <section className="admin-article-list" aria-label="Alle Artikel">
          {articles.length === 0 && <div className="empty-state"><h2>Noch keine Artikel</h2><p>Lege den ersten Wikiartikel an.</p></div>}
          {articles.map((article) => (
            <article className="admin-article-row" key={article.id}>
              <div>
                <div className="article-meta">
                  <span className={`status status-${article.status}`}>{article.status === "published" ? "Veröffentlicht" : "Entwurf"}</span>
                  <span>{article.category}</span>
                  <span>Geändert {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(article.updatedAt))}</span>
                </div>
                <h2>{article.title}</h2>
                <p>{article.summary}</p>
              </div>
              <div className="row-actions">
                {article.status === "published" && <Link className="button button-small button-secondary" href={`/wiki/${article.slug}`}>Öffnen</Link>}
                <Link className="button button-small" href={`/verwaltung/articles/${article.id}/edit`}>Bearbeiten</Link>
                <DeleteButton action={deleteArticleAction} id={article.id} />
              </div>
            </article>
          ))}
        </section>
      </div><footer className="site-footer">© Thomas Knebel · Version 02.08.2026</footer>
    </main>
  );
}
