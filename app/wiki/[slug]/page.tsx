import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "../../../lib/wiki";
import { ArticleContent } from "../article-content";
import { requireUser } from "../../../lib/current-user";
import { SiteHeader } from "../../site-header";

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
      <SiteHeader title="Wiki" />
      <div className="page-shell article">
        <Link className="back" href="/wiki">← Alle Artikel</Link>
        <div className="eyebrow">
          {article.category} · Aktualisiert am{" "}
          {new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date(article.updatedAt))}
        </div>
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <ArticleContent content={article.content} />
      </div>
    </main>
  );
}
