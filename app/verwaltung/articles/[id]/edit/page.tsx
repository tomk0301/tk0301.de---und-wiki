import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "../../../../../lib/current-user";
import { getArticleById } from "../../../../../lib/wiki";
import { ArticleForm } from "../../article-form";
import { deleteArticleAction, updateArticleAction } from "../../actions";
import { logout } from "../../../../login/actions";

export const metadata: Metadata = { title: "Wikiartikel bearbeiten" };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; uploaded?: string }>;
}) {
  await requireRole("admin");
  const article = await getArticleById((await params).id);
  if (!article) notFound();
  const query = await searchParams;
  return (
    <main className="subpage">
      <header className="site-header">
        <Link className="brand" href="/verwaltung/articles"><span className="brand-mark">TK</span><span>Artikel bearbeiten</span></Link><nav><Link href="/wiki">Hauptseite</Link><Link href="/verwaltung">Verwaltung</Link><form action={logout}><button className="button button-small" type="submit">Abmelden</button></form></nav>
      </header>
      <div className="page-shell editor-shell">
        <div className="eyebrow">{article.status === "published" ? "Veröffentlicht" : "Entwurf"}</div>
        <h1>{article.title}</h1>
        {query.saved && <p className="success" role="status">Die Änderungen wurden gespeichert.</p>}
        <ArticleForm action={updateArticleAction} article={article} error={query.error} uploaded={query.uploaded} />
        <section className="danger-zone">
          <div><h2>Artikel löschen</h2><p>Diese Aktion kann nicht rückgängig gemacht werden.</p></div>
          <form action={deleteArticleAction}>
            <input type="hidden" name="id" value={article.id} />
            <label className="confirm-check"><input type="checkbox" name="confirm" value="yes" required /> Löschen bestätigen</label>
            <button className="button button-danger" type="submit">Artikel endgültig löschen</button>
          </form>
        </section>
      </div>
    </main>
  );
}
