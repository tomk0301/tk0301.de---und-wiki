export function parseCardOpening(line: string): { kind: string; title: string } | null {
  const match = line.trim().match(/^:::(hinweis|warnung|info|neutral|farbe)(?:[ \t]+(.+))?$/);
  return match ? { kind: match[1], title: match[2]?.trim() || "" } : null;
}

export function splitMarkdownBlocks(source: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inCard = false;
  const flush = () => {
    if (current.some((line) => line.trim())) blocks.push(current.join("\n"));
    current = [];
  };
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!inCard && parseCardOpening(trimmed)) {
      flush(); current.push(trimmed); inCard = true; continue;
    }
    if (inCard) {
      current.push(line);
      if (trimmed === ":::") { flush(); inCard = false; }
      continue;
    }
    if (!trimmed) { flush(); continue; }
    current.push(line);
  }
  flush();
  return blocks;
}
