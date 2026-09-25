import type { Metadata } from "next";
import { requireRole } from "../../../../lib/current-user";
import { ArticleForm } from "../article-form";
import { createArticleAction } from "../actions";
import { SiteHeader } from "../../../site-header";

export const metadata: Metadata = { title: "Neuer Wikiartikel" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("admin");
  return (
    <main className="subpage">
      <SiteHeader title="Neuer Artikel" />
      <div className="page-shell editor-shell">
        <div className="eyebrow">Wiki verwalten</div>
        <h1>Artikel anlegen</h1>
        <ArticleForm action={createArticleAction} error={(await searchParams).error} />
      </div>
    </main>
  );
}
