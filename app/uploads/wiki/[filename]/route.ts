import { readFile } from "node:fs/promises";
import path from "node:path";

const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const filename = (await params).filename;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|gif)$/.test(filename)) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(path.join(process.cwd(), ".wrangler", "wiki-uploads", filename));
    const extension = filename.split(".").pop() || "";
    return new Response(body, { headers: { "Content-Type": types[extension], "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
