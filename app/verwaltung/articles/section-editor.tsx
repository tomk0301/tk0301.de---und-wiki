"use client";
import { useMemo, useState, useRef } from "react";
import Link from "next/link";

export function SectionEditor({ initial, previewHref, cancelHref = "/verwaltung/articles" }: { initial?: string; previewHref?: string; cancelHref?: string }) {
  const sections = useMemo(() => {
    const text = initial || "";
    const matches = [...text.matchAll(/(^|\n)(#{2,3}\s+[^\n]+)/g)];
    if (!matches.length) return [{ heading: "", body: text }];
    return matches.map((m, i) => ({ heading: m[2], body: text.slice(m.index! + m[0].length, matches[i + 1]?.index ?? text.length).trim() }));
  }, [initial]);
  const [values, setValues] = useState(sections);
  const combined = values.map((s) => [s.heading, s.body].filter(Boolean).join("\n\n")).join("\n\n");
  return <div className="section-editor"><input type="hidden" name="content" value={combined} readOnly />{values.map((section, i) => <Section key={i} section={section} previewHref={previewHref} cancelHref={cancelHref} onDelete={() => { if (confirm("Diesen Abschnitt wirklich löschen?")) setValues(values.filter((_, n) => n !== i)); }} onChange={(body) => setValues(values.map((v, n) => n === i ? { ...v, body } : v))} />)}</div>;
}

function Section({ section, previewHref, cancelHref, onDelete, onChange }: { section: { heading: string; body: string }; previewHref?: string; cancelHref: string; onDelete: () => void; onChange: (body: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showSyntax, setShowSyntax] = useState(false);
  const wrap = (before: string, after = before) => { const el = ref.current; if (!el) return; const a = el.selectionStart, b = el.selectionEnd, text = el.value, selected = text.slice(a, b) || (before === "\n\n" ? "" : "Text"); onChange(text.slice(0, a) + before + selected + after + text.slice(b)); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, a + before.length + selected.length); }); };
  const insert = (value: string) => { const el = ref.current; if (!el) return; const a = el.selectionStart, b = el.selectionEnd; onChange(el.value.slice(0, a) + value + el.value.slice(b)); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + value.length, a + value.length); }); };
  return <details open><summary>{section.heading || "Einleitung"}</summary><div className="markdown-toolbar"><button type="button" onClick={() => wrap("**")}><strong>B</strong></button><button type="button" onClick={() => wrap("*")}><em>I</em></button><button type="button" onClick={() => wrap("__")}><u>U</u></button><button type="button" onClick={() => wrap("[", "](https://)")}>↗</button><button type="button" onClick={() => wrap("## ", "")}>H2</button><button type="button" onClick={() => wrap("### ", "")}>H3</button><button type="button" onClick={() => wrap("- ", "")}>•</button><button type="button" onClick={() => wrap("1. ", "")}>1.</button><button type="button" onClick={() => wrap("\n\n", "")}>¶</button><button type="button" onClick={() => wrap("| Spalte 1 | Spalte 2 |\n| --- | --- |\n| Inhalt | Inhalt |", "")}>▦</button><CardMenu insert={insert} /><button type="button" className="syntax-toggle" onClick={() => setShowSyntax(!showSyntax)} aria-expanded={showSyntax}>ASCII</button></div>{showSyntax && <AsciiTable />}<textarea ref={ref} value={section.body} onChange={(e) => onChange(e.target.value)} rows={8} /><div className="section-actions"><button className="button button-small" type="submit">Speichern</button>{previewHref && <Link className="button button-small button-secondary" href={previewHref}>Vorschau</Link>}<Link className="button button-small button-secondary" href={cancelHref}>Abbrechen</Link><button className="button button-small button-danger" type="button" onClick={onDelete}>Abschnitt löschen</button></div></details>;
}

function AsciiTable() {
  const [copied, setCopied] = useState("");
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); } catch { const area = document.createElement("textarea"); area.value = value; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); } setCopied(value); window.setTimeout(() => setCopied(""), 1400); };
  const codes = Array.from({ length: 224 }, (_, i) => i + 32);
  const label = (code: number) => code === 32 ? "SP" : code === 127 ? "DEL" : code <= 126 ? String.fromCharCode(code) : code < 160 ? `U+${code.toString(16).padStart(4, "0").toUpperCase()}` : String.fromCharCode(code);
  return <div className="ascii-table"><div className="syntax-table-title">ASCII-Sonderzeichen – Zeichen anklicken zum Kopieren</div><div className="ascii-grid">{codes.map((code) => { const char = String.fromCharCode(code); return <button type="button" key={code} title={`ASCII-Code ${code}`} onClick={() => copy(char)}><span>{label(code)}</span><small>{code}</small>{copied === char && <em>Kopiert</em>}</button>; })}</div></div>;
}

function CardMenu({ insert }: { insert: (value: string) => void }) {
  return <select aria-label="Kartenvariante" defaultValue="" onChange={(event) => { const value = event.target.value; if (value) insert(`\n\n:::${value}\nText hier eingeben\n:::\n\n`); event.currentTarget.value = ""; }}><option value="">▣ Karte</option><option value="hinweis">Hinweis-Karte</option><option value="warnung">Warnung-Karte</option><option value="info">Info-Karte</option><option value="neutral">Neutraler Rahmen</option><option value="farbe">Farblich hervorgehobener Bereich</option></select>;
}
