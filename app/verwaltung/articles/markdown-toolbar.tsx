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
  function insertText(text: string) {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.focus(); el.setSelectionRange(start + text.length, start + text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  async function importMarkdown(file?: File) {
    if (!file || !ref.current) return;
    const source = await file.text();
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const form = ref.current.closest("form");
    const setField = (name: string, value: string) => {
      const field = form?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);
      if (field) { field.value = value; field.dispatchEvent(new Event("input", { bubbles: true })); }
    };
    if (frontmatter) {
      for (const line of frontmatter[1].split(/\r?\n/)) {
        const separator = line.indexOf(":");
        if (separator < 0) continue;
        const key = line.slice(0, separator).trim();
        if (!["title", "slug", "summary", "category"].includes(key)) continue;
        const raw = line.slice(separator + 1).trim();
        let value = raw;
        if (raw.startsWith('"')) { try { value = JSON.parse(raw); } catch { /* plain YAML value */ } }
        setField(key, value);
      }
    } else if (!form?.querySelector<HTMLInputElement>('[name="title"]')?.value) {
      setField("title", file.name.replace(/\.md$/i, "").replace(/[-_]+/g, " "));
    }
    ref.current.value = (frontmatter ? source.slice(frontmatter[0].length) : source).trim();
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
    <button type="button" onClick={() => apply("`")} title="Inline-Code">{"</>"}</button>
    <button type="button" onClick={() => apply("```\n", "\n```")} title="Codeblock">{"{ }"}</button>
    <button type="button" onClick={() => apply("> ", "")} title="Zitat">❞</button>
    <button type="button" onClick={() => apply("![", "](https://)")} title="Bild">▧</button>
    <button type="button" onClick={() => insertText("\n\n---\n\n")} title="Trennlinie">—</button>
  </div><label className="markdown-import">Markdown-Datei importieren <input type="file" accept=".md,text/markdown,text/plain" onChange={(event) => importMarkdown(event.target.files?.[0])} /></label><textarea ref={ref} className="content-editor" name="content" defaultValue={defaultValue} minLength={20} maxLength={50000} rows={20} required={required} placeholder={"## Zwischenüberschrift\n\nAbsatztext\n\n- Listenpunkt"} /></div>;
}
