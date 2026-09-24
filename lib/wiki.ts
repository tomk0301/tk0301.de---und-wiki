import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type ArticleStatus = "draft" | "published";
export type ArticleVisibility = "public" | "private";
export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  content: string;
  status: ArticleStatus;
  visibility: ArticleVisibility;
  createdAt: string;
  updatedAt: string;
};
export type ArticleInput = Pick<Article, "slug" | "title" | "summary" | "category" | "content" | "status" | "visibility">;

const root = process.env.ARTICLE_MARKDOWN_DIR || path.join(process.cwd(), ".wrangler", "wiki-content");
const locations = {
  public: path.join(root, "public"),
  private: path.join(root, "private"),
};

function location(article: Article) {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(article.slug)) throw new Error("INVALID_SLUG");
  return path.join(locations[article.visibility], `${article.slug}.md`);
}

export function normalizeSlug(value: string) {
  return value.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function encode(article: Article) {
  const fields = {
    id: article.id, slug: article.slug, title: article.title,
    summary: article.summary, category: article.category,
    status: article.status, visibility: article.visibility,
    createdAt: article.createdAt, updatedAt: article.updatedAt,
  };
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n\n${article.content.trim()}\n`;
}

function decode(source: string, visibility: ArticleVisibility, filename: string): Article {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`INVALID_FRONTMATTER: ${filename}`);
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`INVALID_FRONTMATTER: ${filename}`);
    fields[line.slice(0, separator)] = JSON.parse(line.slice(separator + 1).trim());
  }
  const article: Article = {
    id: fields.id, slug: fields.slug, title: fields.title,
    summary: fields.summary, category: fields.category, content: match[2].trim(),
    status: fields.status as ArticleStatus, visibility,
    createdAt: fields.createdAt, updatedAt: fields.updatedAt,
  };
  if (!article.id || !article.title || !article.slug || !["draft", "published"].includes(article.status) ||
      location(article) !== path.join(locations[visibility], filename)) {
    throw new Error(`INVALID_ARTICLE: ${filename}`);
  }
  return article;
}

async function readAll(): Promise<Article[]> {
  const articles: Article[] = [];
  for (const visibility of ["public", "private"] as const) {
    const dir = locations[visibility];
    for (const filename of await readdir(dir)) {
      if (filename.endsWith(".md")) {
        articles.push(decode(await readFile(path.join(dir, filename), "utf8"), visibility, filename));
      }
    }
  }
  return articles;
}

async function save(article: Article) {
  const filename = location(article);
  await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  const temp = `${filename}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, encode(article), { encoding: "utf8", mode: 0o600 });
  await rename(temp, filename);
}

let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function listArticles(includeDrafts = false) {
  return (await readAll())
    .filter((article) => includeDrafts || (article.status === "published" && article.visibility === "public"))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getArticle(slug: string, includeDrafts = false) {
  return (await readAll()).find((article) => article.slug === slug &&
    (includeDrafts || (article.status === "published" && article.visibility === "public")));
}
export async function getArticleById(id: string) {
  return (await readAll()).find((article) => article.id === id);
}
export async function createArticle(input: ArticleInput) {
  return serialized(async () => {
    if ((await readAll()).some((article) => article.slug === input.slug)) throw new Error("SLUG_EXISTS");
    const now = new Date().toISOString();
    const article = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    await save(article);
    return article;
  });
}
export async function updateArticle(id: string, input: ArticleInput) {
  return serialized(async () => {
    const articles = await readAll();
    const previous = articles.find((article) => article.id === id);
    if (!previous) throw new Error("NOT_FOUND");
    if (articles.some((article) => article.id !== id && article.slug === input.slug)) throw new Error("SLUG_EXISTS");
    const updated = { ...previous, ...input, updatedAt: new Date().toISOString() };
    await save(updated);
    if (location(previous) !== location(updated)) await unlink(location(previous));
    return updated;
  });
}
export async function deleteArticle(id: string) {
  return serialized(async () => {
    const previous = (await readAll()).find((article) => article.id === id);
    if (!previous) throw new Error("NOT_FOUND");
    await unlink(location(previous));
  });
}
