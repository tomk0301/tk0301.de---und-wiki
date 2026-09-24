"use client";

import { useRef } from "react";

export function MarkdownEditor({ defaultValue, required }: { defaultValue?: string; required?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function apply(before: string, after = before) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd, value = el.value;
    const selected = value.slice(start, end) || "Text";
    el.value = value.slice(0, start) + before + selected + after + value.slice(end);
    el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function insertTable() {
    const el = ref.current; if (!el) return;
    const value = el.value, start = el.selectionStart, end = el.selectionEnd;
    const table = "| Spalte 1 | Spalte 2 |\n| --- | --- |\n| Inhalt | Inhalt |";
    el.value = value.slice(0, start) + table + value.slice(end);
    el.focus(); el.setSelectionRange(start, start + table.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  async function importMarkdown(file?: File) {
    if (!file || !ref.current) return;
    const source = await file.text();
    ref.current.value = source.replace(/^---[\s\S]*?---\s*/, "").trim();
    ref.current.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return <div className="markdown-editor"><div className="markdown-toolbar" aria-label="Formatierung">
    <button type="button" onClick={() => apply("**")} title="Fett"><strong>B</strong></button>
    <button type="button" onClick={() => apply("*")} title="Kursiv"><em>I</em></button>
    <button type="button" onClick={() => apply("__")} title="Unterstrichen"><u>U</u></button>
    <button type="button" onClick={() => apply("[", "](https://)")} title="Link">↗</button>
    <button type="button" onClick={() => apply("## ", "")} title="Überschrift">H2</button>
    <button type="button" onClick={() => apply("### ", "")} title="Unterüberschrift">H3</button>
    <button type="button" onClick={() => apply("- ", "")} title="Aufzählung">•</button>
    <button type="button" onClick={() => apply("1. ", "")} title="Nummerierung">1.</button>
    <button type="button" onClick={insertTable} title="Tabelle">▦</button>
  </div><label className="markdown-import">Markdown-Datei importieren <input type="file" accept=".md,text/markdown,text/plain" onChange={(event) => importMarkdown(event.target.files?.[0])} /></label><textarea ref={ref} className="content-editor" name="content" defaultValue={defaultValue} minLength={20} maxLength={50000} rows={20} required={required} placeholder={"## Zwischenüberschrift\n\nAbsatztext\n\n- Listenpunkt"} /></div>;
}
