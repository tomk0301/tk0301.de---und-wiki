"use client";
import type { deleteArticleAction } from "./actions";

export function DeleteButton({ action, id }: { action: typeof deleteArticleAction; id: string }) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Diesen Artikel wirklich endgültig löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.")) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><input type="hidden" name="confirm" value="yes" /><button className="button button-small button-danger" type="submit">Artikel löschen</button></form>;
}
