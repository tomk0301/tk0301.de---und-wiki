import { parseCardOpening, splitMarkdownBlocks } from "../../lib/markdown-blocks";

export function ArticleContent({ content }: { content: string }) {
  const normalized = content
    .replace(/\r\n/g, "\n")
    // Headings start their own block even when the author omitted a blank line.
    .replace(/(^|\n)(#{2,3}\s+)/g, "$1\n\n$2");
  const blocks = splitMarkdownBlocks(normalized);
  const headings = blocks.flatMap((block) => { const first = block.split("\n")[0]?.trim() || ""; if (!/^#{2,3}\s+/.test(first)) return []; const level = first.startsWith("### ") ? 3 : 2; const title = first.slice(level + 1).trim(); return [{ level, title, id: headingId(title) }]; });
  const firstHeadingIndex = blocks.findIndex((block) => /^#{2,3}\s+/.test(block.split("\n")[0]?.trim() || ""));
  return (
    <div className="article-content">
      {headings.length > 0 && <nav id="article-top" className="article-toc" aria-label="Inhaltsverzeichnis"><strong>Inhalt</strong><ol>{headings.map((heading) => <li className={heading.level === 3 ? "toc-sub" : ""} key={heading.id}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol></nav>}
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return null;
        const headingLevel = lines[0].startsWith("### ") ? 3 : lines[0].startsWith("## ") ? 2 : 0;
        const heading = headingLevel ? lines[0].slice(headingLevel + 1).trim() : null;
        const body = heading ? lines.slice(1) : lines;
        const card = parseCardOpening(lines[0] || "");
        if (lines[0]?.startsWith("```") && lines[lines.length - 1] === "```") {
          return <pre key={index}><code>{block.split("\n").slice(1, -1).join("\n")}</code></pre>;
        }
        if (lines.every((line) => line.startsWith("> "))) {
          return <blockquote key={index}>{lines.map((line, item) => <p key={item}>{inline(line.slice(2))}</p>)}</blockquote>;
        }
        if (lines.length === 1 && /^(---|\*\*\*|___)$/.test(lines[0])) return <hr key={index} />;
        if (card) {
          const cardBody = block.split("\n").slice(1, -1).join("\n").trim();
          return <div className={`article-card card-${card.kind}`} key={index}>{card.title && <strong className="article-card-title">{inline(card.title)}</strong>}{cardBody.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph.split("\n").map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{inline(line.trim())}</span>)}</p>)}</div>;
        }
        const previousLines = index > 0 ? blocks[index - 1].split("\n").map((line) => line.trim()).filter(Boolean) : [];
        const previousWasHeadingOnly = previousLines.length === 1 && /^#{2,3}\s+/.test(previousLines[0] || "");
        const showBackLink = index > firstHeadingIndex && !previousWasHeadingOnly;
        if (lines.length >= 2 && lines.every((line) => line.trim().startsWith("|"))) {
          const rows = lines.filter((line) => !/^\|?\s*:?-{3,}/.test(line.replace(/\|/g, "").trim())).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
          if (rows.length) return <table className="article-table" key={index}><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{inline(cell)}</th> : <td key={cellIndex}>{inline(cell)}</td>)}</tr>)}</tbody></table>;
        }
        if (body.length && body.every((line) => line.startsWith("- "))) {
          return <section key={index}>{heading && showBackLink && <a className="section-back-to-toc" href="#article-top">Zurück zum Inhaltsverzeichnis</a>}{heading && (headingLevel === 3 ? <h3 id={headingId(heading)}>{inline(heading)}</h3> : <h2 id={headingId(heading)}>{inline(heading)}</h2>)}<ul>{body.map((line, item) => <li key={item}>{inline(line.slice(2))}</li>)}</ul></section>;
        }
        if (body.length && body.every((line) => /^\d+(?:\.\d+)?[.)]?\s+/.test(line))) {
          return <section key={index}>{heading && (headingLevel === 3 ? <h3>{inline(heading)}</h3> : <h2>{inline(heading)}</h2>)}<ol className="custom-ordered-list">{body.map((line, item) => <li className={/^\d+\.\d+\s+/.test(line) ? "nested-list-item" : "ordered-main-item"} key={item}>{orderedInline(line)}</li>)}</ol></section>;
        }
        if (heading) {
          return <section key={index}>{showBackLink && <a className="section-back-to-toc" href="#article-top">Zurück zum Inhaltsverzeichnis</a>}{headingLevel === 3 ? <h3 id={headingId(heading)}>{inline(heading)}</h3> : <h2 id={headingId(heading)}>{inline(heading)}</h2>}{body.length > 0 && <p>{body.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{inline(line)}</span>)}</p>}</section>;
        }
        if (lines.every((line) => line.startsWith("- "))) {
          return <ul key={index}>{lines.map((line, item) => <li key={item}>{line.slice(2)}</li>)}</ul>;
        }
        if (lines.every((line) => /^\d+(?:\.\d+)?[.)]?\s+/.test(line))) {
          return <ol className="custom-ordered-list" key={index}>{lines.map((line, item) => <li className={/^\d+\.\d+\s+/.test(line) ? "nested-list-item" : "ordered-main-item"} key={item}>{orderedInline(line)}</li>)}</ol>;
        }
        return <p key={index}>{lines.map((line, lineIndex) => { const numbered = line.match(/^(\d+(?:\.\d+)?)[.)]?\s+(.*)$/); const bullet = line.match(/^-\s+(.*)$/); const block = Boolean(numbered || bullet); const previous = lineIndex > 0 ? lines[lineIndex - 1] : ""; const previousBlock = /^(?:\d+(?:\.\d+)?[.)]?\s+|-\s+)/.test(previous); return <span className={numbered ? (numbered[1].includes(".") ? "inline-nested-number" : "inline-main-number") : bullet ? "inline-bullet" : ""} key={lineIndex}>{lineIndex > 0 && !block && !previousBlock && <br />}{numbered ? <><span className="list-number">{numbered[1]}.</span>{inline(numbered[2])}</> : bullet ? <><span className="bullet-mark">•</span>{inline(bullet[1])}</> : inline(line)}</span>; })}</p>;
      })}
      {headings.length > 0 && <p className="article-final-back"><a href="#article-top">Zurück zum Inhaltsverzeichnis</a></p>}
    </div>
  );
}

function headingId(value: string) { return `heading-${value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`; }

function orderedInline(line: string) {
  const match = line.match(/^(\d+(?:\.\d+)?)[.)]?\s+(.*)$/);
  return match ? <><span className="list-number">{match[1]}.</span>{inline(match[2])}</> : inline(line);
}

function inline(text: string) {
  const token = /(`[^`]+`|!?\[[^\]]*\]\((?:https?:\/\/|\/)[^)\s]+\)|https?:\/\/[^\s]+|\*\*.+?\*\*|__.+?__|\*.+?\*)/g;
  const parts = text.split(token);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (markdownLink) return <a href={markdownLink[2]} key={index} title={markdownLink[2]} target="_blank" rel="noreferrer">{markdownLink[1]}</a>;
    if (/^https?:\/\//.test(part)) return <a href={part} key={index} title={part} target="_blank" rel="noreferrer">{part}</a>;
    const image = part.match(/^!?\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/);
    if (image) return <img className="article-image" src={image[2]} alt={image[1]} key={index} loading="lazy" />;
    const bold = part.match(/^\*\*(.+?)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;
    const underline = part.match(/^__(.+?)__$/);
    if (underline) return <u key={index}>{underline[1]}</u>;
    const italic = part.match(/^\*(.+?)\*$/);
    if (italic) return <em key={index}>{italic[1]}</em>;
    return part;
  });
}
