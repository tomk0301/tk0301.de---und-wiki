import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "../../../lib/wiki";
import { ArticleContent } from "../article-content";
import { requireUser } from "../../../lib/current-user";
import { logout } from "../../login/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const user = await requireUser();
  const article = await getArticle((await params).slug, false, user.role === "admin");
  return article ? { title: article.title, description: article.summary } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const article = await getArticle((await params).slug, false, user.role === "admin");
  if (!article) notFound();
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/wiki"><span className="brand-mark">TK</span><span>Wiki</span></Link>
        <nav aria-label="Wiki-Navigation"><Link href="/">Hauptseite</Link>{user.role === "admin" && <><Link href="/verwaltung/articles">Artikel verwalten</Link><Link href="/verwaltung/einstellungen">Konfiguration</Link></>}<form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="page-shell article">
        <Link className="back" href="/wiki">← Alle Artikel</Link>
        <div className="eyebrow">
          {article.category} · Aktualisiert am{" "}
          {new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date(article.updatedAt))}
        </div>
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <ArticleContent content={article.content} />
      </div><footer className="site-footer">© Thomas Knebel · Version 02.08.2026</footer>
    </main>
  );
}
