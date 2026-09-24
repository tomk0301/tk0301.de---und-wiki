"use server";

import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createArticle,
  deleteArticle,
  normalizeSlug,
  updateArticle,
  type ArticleInput,
} from "../../../lib/wiki";
import { requireRole } from "../../../lib/current-user";

function field(formData: FormData, name: string, max: number) {
  return String(formData.get(name) || "").trim().slice(0, max);
}

function parseArticle(formData: FormData): ArticleInput {
  const title = field(formData, "title", 140);
  const slug = normalizeSlug(field(formData, "slug", 100) || title);
  const summary = field(formData, "summary", 320);
  const category = field(formData, "category", 60);
  const content = field(formData, "content", 50_000);
  const status = formData.get("status") === "published" ? "published" : "draft";
  const visibility = formData.get("visibility") === "private" ? "private" : "public";

  if (title.length < 3 || !slug || !category || content.length < 20) {
    throw new Error("VALIDATION");
  }
  return { title, slug, summary, category, content, status, visibility };
}

function errorTarget(base: string, error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const value =
    code === "SLUG_EXISTS" ? "slug" : code === "VALIDATION" ? "validation" : "unknown";
  return `${base}?error=${value}`;
}

export async function createArticleAction(formData: FormData) {
  await requireRole("admin");
  try {
    const article = await createArticle(parseArticle(formData));
    redirect(`/verwaltung/articles/${article.id}/edit?saved=created`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    redirect(errorTarget("/verwaltung/articles/new", error));
  }
}

export async function updateArticleAction(formData: FormData) {
  await requireRole("admin");
  const id = field(formData, "id", 80);
  try {
    await updateArticle(id, parseArticle(formData));
    redirect(`/verwaltung/articles/${id}/edit?saved=updated`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    redirect(errorTarget(`/verwaltung/articles/${id}/edit`, error));
  }
}

export async function deleteArticleAction(formData: FormData) {
  await requireRole("admin");
  const id = field(formData, "id", 80);
  if (formData.get("confirm") !== "yes") {
    redirect(`/verwaltung/articles/${id}/edit?error=confirm`);
  }
  await deleteArticle(id);
  redirect("/verwaltung/articles?deleted=1");
}

export async function uploadImageAction(formData: FormData) {
  await requireRole("admin");
  const id = field(formData, "id", 80);
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0 || file.size > 8 * 1024 * 1024) {
    redirect(`/verwaltung/articles/${id}/edit?error=image`);
  }
  const allowed: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const extension = allowed[file.type];
  if (!extension) redirect(`/verwaltung/articles/${id}/edit?error=image-type`);
  const directory = path.join(process.cwd(), ".wrangler", "wiki-uploads");
  await mkdir(directory, { recursive: true });
  const filename = `${id}-${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()), { mode: 0o640 });
  redirect(`/verwaltung/articles/${id}/edit?uploaded=${encodeURIComponent(`/uploads/wiki/${filename}`)}`);
}
