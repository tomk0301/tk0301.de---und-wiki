import type { Metadata } from "next";
import Link from "next/link";
import { listArticles } from "../../lib/wiki";
import { requireUser } from "../../lib/current-user";
import { logout } from "../login/actions";
import { getSiteSettings } from "../../lib/site-settings";

export const metadata: Metadata = { title: "Wiki", description: "Geschützte Wissenssammlung von TK0301." };
export const dynamic = "force-dynamic";

export default async function WikiPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const user = await requireUser();
  const params = await searchParams; const query = (params.q || "").trim().toLowerCase(); const sort = params.sort || "updated";
  const articles = (await listArticles()).filter((article) => !query || `${article.title} ${article.summary} ${article.category}`.toLowerCase().includes(query)).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "de") : sort === "created" ? +new Date(b.createdAt) - +new Date(a.createdAt) : +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const settings = await getSiteSettings();
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">TK</span><span>Wiki</span></Link>
        <nav aria-label="Wiki-Navigation"><Link href="/">Hauptseite</Link>{user.role === "admin" && <><Link href="/verwaltung/articles">Artikel verwalten</Link><Link href="/verwaltung/einstellungen">Konfiguration</Link></>}<form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="page-shell">
        <section className="page-heading">
          <div className="eyebrow">{settings.wikiEyebrow}</div>
          <h1>{settings.wikiTitle.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
          <p>{settings.wikiIntro}</p>
        </section>
        <section className="article-list" aria-label="Wikiartikel">
          <form className="wiki-filter" method="get"><input name="q" defaultValue={params.q} placeholder="Artikel suchen …" aria-label="Artikel suchen" /><select name="sort" defaultValue={sort} aria-label="Sortierung"><option value="updated">Zuletzt bearbeitet</option><option value="created">Erstelltdatum</option><option value="title">Alphabetisch</option></select><button className="button button-small" type="submit">Anwenden</button></form>
          {articles.map((article, index) => (
            <Link className="article-row" href={`/wiki/${article.slug}`} key={article.slug}>
              <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{article.title}</h2><p>{article.summary}</p></div>
              <span className="tag">{article.category}</span>
            </Link>
          ))}
          {articles.length === 0 && <div className="empty-state"><h2>Noch keine veröffentlichten Artikel</h2><p>Schau später wieder vorbei.</p></div>}
        </section>
      </div><footer className="site-footer">© Thomas Knebel · Version 02.08.2026</footer>
    </main>
  );
}
