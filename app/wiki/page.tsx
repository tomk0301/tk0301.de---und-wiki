import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "../../lib/wiki";
import { requireUser } from "../../lib/current-user";
import { SiteHeader } from "../site-header";
import { getSiteSettings } from "../../lib/site-settings";

export const metadata: Metadata = { title: "Wiki", description: "Geschützte Wissenssammlung von TK0301." };
export const dynamic = "force-dynamic";

export default async function WikiPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const user = await requireUser();
  const params = await searchParams; const query = (params.q || "").trim().toLowerCase(); const sort = params.sort || "updated";
  const articles = (await listArticles(false, user.role === "admin")).filter((article) => !query || `${article.title} ${article.summary} ${article.category}`.toLowerCase().includes(query)).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "de") : sort === "created" ? +new Date(b.createdAt) - +new Date(a.createdAt) : +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const settings = await getSiteSettings();
  return (
    <main className="subpage">
      <SiteHeader title="Wiki" />
      <div className="page-shell">
        <section className="page-heading">
          <div className="eyebrow">{settings.wikiEyebrow}</div>
          <h1>{settings.wikiTitle.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>{settings.wikiIntro}</p>
        </section>
        <section className="article-list" aria-label="Wikiartikel">
          <form className="wiki-filter" method="get"><input name="q" defaultValue={params.q} placeholder="Artikel suchen …" aria-label="Artikel suchen" /><select name="sort" defaultValue={sort} aria-label="Sortierung"><option value="updated">Zuletzt bearbeitet</option><option value="created">Erstelltdatum</option><option value="title">Alphabetisch</option></select><button className="button button-small" type="submit">Anwenden</button></form>
          {articles.map((article, index) => (
            <div className="article-row" key={article.slug}>
              <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
              <Link className="article-row-content" href={`/wiki/${article.slug}`}><h2>{article.title}</h2><p>{article.summary}</p></Link>
              <span className="tag">{article.category}</span>
              {user.role === "admin" && <Link className="article-edit-link" href={`/verwaltung/articles/${article.id}/edit`} aria-label={`${article.title} bearbeiten`}>Bearbeiten</Link>}
            </div>
          ))}
          {articles.length === 0 && <div className="empty-state"><h2>Noch keine veröffentlichten Artikel</h2><p>Schau später wieder vorbei.</p></div>}
        </section>
      </div>
    </main>
  );
}
