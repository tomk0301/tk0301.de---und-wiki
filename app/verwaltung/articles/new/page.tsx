import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "../../../../lib/current-user";
import { ArticleForm } from "../article-form";
import { createArticleAction } from "../actions";

export const metadata: Metadata = { title: "Neuer Wikiartikel" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/verwaltung/articles"><span className="brand-mark">TK</span><span>Neuer Artikel</span></Link>
      </header>
      <div className="page-shell editor-shell">
        <div className="eyebrow">Wiki verwalten</div>
        <h1>Artikel anlegen</h1>
        <ArticleForm action={createArticleAction} error={(await searchParams).error} />
      </div>
    </main>
  );
}
