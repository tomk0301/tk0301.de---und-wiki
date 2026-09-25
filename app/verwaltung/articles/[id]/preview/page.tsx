import { notFound } from "next/navigation";
import { requireRole } from "../../../../../lib/current-user";
import { getArticleById } from "../../../../../lib/wiki";
import { ArticleContent } from "../../../../wiki/article-content";
import { SiteHeader } from "../../../../site-header";

export const dynamic = "force-dynamic";

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const article = await getArticleById((await params).id);
  if (!article) notFound();
  return (
    <main className="subpage">
      <SiteHeader title="Vorschau" editorHref={`/verwaltung/articles/${article.id}/edit`} />
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
