import { cookies, headers } from "next/headers";
import { verifySession } from "../../../lib/auth";
import { getSiteSettings } from "../../../lib/site-settings";
import { remainingIdleSeconds, revokeIdleSession, touchIdleSession } from "../../../lib/idle-session";
import { getUserById } from "../../../lib/users";

export const dynamic = "force-dynamic";

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function session() {
  const token = (await cookies()).get("tk_session")?.value;
  const userId = verifySession(token);
  const user = userId ? await getUserById(userId) : null;
  return token && user?.active ? token : null;
}

async function sameOrigin() {
  const incoming = await headers();
  const origin = incoming.get("origin");
  const host = incoming.get("x-forwarded-host") || incoming.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function GET() {
  const token = await session();
  if (!token) return reply({ error: "unauthorized" }, 401);
  const { idleTimeoutMinutes } = await getSiteSettings();
  const remainingSeconds = await remainingIdleSeconds(token, idleTimeoutMinutes);
  return remainingSeconds > 0 ? reply({ remainingSeconds }) : reply({ error: "expired" }, 401);
}

export async function POST() {
  if (!await sameOrigin()) return reply({ error: "origin" }, 403);
  const token = await session();
  if (!token) return reply({ error: "unauthorized" }, 401);
  const { idleTimeoutMinutes } = await getSiteSettings();
  const remainingSeconds = await touchIdleSession(token, idleTimeoutMinutes);
  return remainingSeconds > 0 ? reply({ remainingSeconds }) : reply({ error: "expired" }, 401);
}

export async function DELETE() {
  if (!await sameOrigin()) return reply({ error: "origin" }, 403);
  const jar = await cookies();
  const token = jar.get("tk_session")?.value;
  if (token) await revokeIdleSession(token);
  jar.delete("tk_session");
  return reply({ ok: true });
}
