import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const appRoot = process.env.WIKI_APP_ROOT || process.cwd();
const source = path.join(appRoot, ".wrangler", "wiki-articles.json");
const target = process.env.ARTICLE_MARKDOWN_DIR || path.join(appRoot, ".wrangler", "wiki-content");
const articles = JSON.parse(await readFile(source, "utf8"));
if (!Array.isArray(articles) || articles.length < 23) throw new Error("Expected the complete 23-article source");
const slugs = new Set();
for (const article of articles) {
  if (!article.id || !article.title || !article.content || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(article.slug) ||
      slugs.has(article.slug)) throw new Error(`Invalid or duplicate article: ${article.slug}`);
  slugs.add(article.slug);
}
const privateCategories = new Set(["privat", "garten", "behörden"]);
const publicDir = path.join(target, "public");
const privateDir = path.join(target, "private");
await mkdir(publicDir, { recursive: true, mode: 0o700 });
await mkdir(privateDir, { recursive: true, mode: 0o700 });
if ((await readdir(publicDir)).length || (await readdir(privateDir)).length) throw new Error("Markdown destination is not empty");
const counts = { public: 0, private: 0 };
for (const article of articles) {
  const visibility = privateCategories.has(article.category.toLowerCase()) || ["firefox", "chatgpt"].includes(article.slug) ? "private" : "public";
  const fields = {
    id: article.id, slug: article.slug, title: article.title,
    summary: article.summary, category: article.category,
    status: article.status, visibility,
    createdAt: article.createdAt, updatedAt: article.updatedAt,
  };
  const markdown = `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n\n${article.content.trim()}\n`;
  const filename = path.join(visibility === "private" ? privateDir : publicDir, `${article.slug}.md`);
  await writeFile(filename, markdown, { encoding: "utf8", mode: 0o600, flag: "wx" });
  counts[visibility] += 1;
}
console.log(JSON.stringify({ total: articles.length, ...counts }));
