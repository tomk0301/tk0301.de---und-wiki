import Link from "next/link";
import type { Article } from "../../../lib/wiki";
import { uploadImageAction } from "./actions";
import { ImageUpload } from "./image-upload";
import { MarkdownEditor } from "./markdown-toolbar";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  article?: Article;
  error?: string;
  uploaded?: string;
};

const messages: Record<string, string> = {
  slug: "Diese Webadresse wird bereits von einem anderen Artikel verwendet.",
  validation: "Bitte alle Pflichtfelder vollständig und sinnvoll ausfüllen.",
  confirm: "Bitte das Kontrollfeld bestätigen, bevor der Artikel gelöscht wird.",
  unknown: "Der Artikel konnte nicht gespeichert werden. Bitte erneut versuchen.",
};

export function ArticleForm({ action, article, error, uploaded }: Props) {
  return (
    <>
    <form action={action} className="editor-form">
      {article && <input type="hidden" name="id" value={article.id} />}
      {error && <p className="error" role="alert">{messages[error] || messages.unknown}</p>}
      <div className="editor-grid">
        <label className="field field-wide">
          Titel
          <input name="title" defaultValue={article?.title} minLength={3} maxLength={140} required />
        </label>
        <label className="field">
          Webadresse
          <input name="slug" defaultValue={article?.slug} maxLength={80} placeholder="wird aus dem Titel erzeugt" />
        </label>
        <label className="field">
          Kategorie
          <input name="category" defaultValue={article?.category} maxLength={60} required />
        </label>
        <label className="field field-wide">
          Kurzbeschreibung
          <textarea name="summary" defaultValue={article?.summary} maxLength={320} rows={3} />
        </label>
        <label className="field field-wide">
          Inhalt
          <MarkdownEditor defaultValue={article?.content} required />
            <span className="field-help">Formatierung: <code>## Überschrift</code> oder <code>### Unterüberschrift</code>, <code>**fett**</code>, <code>*kursiv*</code>, <code>__unterstrichen__</code>, Link mit <code>[Anzeigetext](https://...)</code>, Leerzeile für Absätze, <code>- Listenpunkt</code>. Karten über „▣ Karte“ in der Werkzeugleiste einfügen.</span>
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={article?.status || "draft"}>
            <option value="draft">Entwurf – nicht öffentlich</option>
            <option value="published">Veröffentlicht</option>
          </select>
        </label>
        <label className="field">
          Sichtbarkeit
          <select name="visibility" defaultValue={article?.visibility || "public"}>
            <option value="public">Öffentlich</option>
            <option value="private">Privat – nur Verwaltung</option>
          </select>
        </label>
      </div>
      <div className="editor-actions">
        <button className="button" type="submit">{article ? "Änderungen speichern" : "Artikel anlegen"}</button>
        {article && <Link className="button button-secondary" href={`/verwaltung/articles/${article.id}/preview`}>Vorschau</Link>}
        <Link className="text-link" href="/verwaltung/articles">Abbrechen</Link>
      </div>
    </form>
      {article && <section className="image-upload">
        <h2>Bild hochladen</h2>
        <p className="field-help">JPG, PNG, WebP oder GIF, maximal 8 MB. Nach dem Upload die angezeigte Bildsyntax in den Inhalt kopieren.</p>
        <ImageUpload articleId={article.id} action={uploadImageAction} uploaded={uploaded} />
      </section>}
    </>
  );
}
