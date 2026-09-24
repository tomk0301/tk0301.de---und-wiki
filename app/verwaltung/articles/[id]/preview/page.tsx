import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "../../../../../lib/current-user";
import { getArticleById } from "../../../../../lib/wiki";
import { ArticleContent } from "../../../../wiki/article-content";
import { logout } from "../../../../login/actions";

export const dynamic = "force-dynamic";

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const article = await getArticleById((await params).id);
  if (!article) notFound();
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href={`/verwaltung/articles/${article.id}/edit`}><span className="brand-mark">TK</span><span>Vorschau</span></Link>
        <nav><Link href="/wiki">Hauptseite</Link><Link href="/verwaltung">Verwaltung</Link><Link className="button button-small" href={`/verwaltung/articles/${article.id}/edit`}>Zurück zum Editor</Link><form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="preview-banner">Nicht öffentliche Vorschau · Status: {article.status === "published" ? "veröffentlicht" : "Entwurf"}</div>
      <div className="page-shell article">
        <div className="eyebrow">{article.category} · Vorschau</div>
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <ArticleContent content={article.content} />
      </div>
    </main>
  );
}
