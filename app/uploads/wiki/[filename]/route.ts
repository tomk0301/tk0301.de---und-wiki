import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "../../../../lib/current-user";
import { getArticleById, listArticles } from "../../../../lib/wiki";

const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const filename = (await params).filename;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/.test(filename)) return new Response("Not found", { status: 404 });
  const articleId = filename.match(/^([0-9a-f-]{36})-/)?.[1];
  const owner = articleId ? await getArticleById(articleId) : undefined;
  const referencedPrivately = (await listArticles(true)).some((article) =>
    article.visibility === "private" && article.content.includes(`/uploads/wiki/${filename}`));
  if ((owner?.visibility === "private" || referencedPrivately) && user.role !== "admin") {
    return new Response("Not found", { status: 404 });
  }
  try {
    const body = await readFile(path.join(process.cwd(), ".wrangler", "wiki-uploads", filename));
    const extension = filename.split(".").pop() || "";
    return new Response(body, { headers: { "Content-Type": types[extension], "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
