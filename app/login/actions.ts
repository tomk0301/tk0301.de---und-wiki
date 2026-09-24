"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, signTrustedDevice, verifyPassword, verifyTotp, verifyTrustedDevice } from "../../lib/auth";
import { secureUrl } from "../../lib/secure-url";
import { getUserByUsername, normalizeUsername } from "../../lib/users";
import { createDevice, getDevice } from "../../lib/devices";

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(username: string) {
  const now = Date.now();
  const existing = attempts.get(username);
  if (!existing || existing.resetAt < now) {
    attempts.set(username, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  existing.count += 1;
  return existing.count > 5;
}

export async function login(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") || ""));
  const password = String(formData.get("password") || "");
  const code = String(formData.get("code") || "");
  const rememberDevice = formData.get("rememberDevice") === "yes";
  if (rateLimited(username)) redirect(await secureUrl("/login?error=rate"));
  const user = await getUserByUsername(username);
  const validPassword = user ? await verifyPassword(password, user.passwordHash) : false;
  const trustedToken = verifyTrustedDevice((await cookies()).get("tk_trusted")?.value);
  const trusted = !!(trustedToken && user && trustedToken.userId === user.id && await getDevice(trustedToken.deviceId, user.id));
  if (!user?.active || !validPassword || (!trusted && !verifyTotp(code, user.totpSecret))) {
    redirect(await secureUrl("/login?error=1"));
  }
  attempts.delete(username);

  const jar = await cookies();
  jar.set("tk_session", signSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  if (rememberDevice) {
    const device = await createDevice(user.id);
    jar.set("tk_trusted", signTrustedDevice(user.id, device.id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 28,
    });
  }
  redirect(await secureUrl("/"));
}

export async function logout() {
  const jar = await cookies();
  jar.delete("tk_session");
  redirect(await secureUrl("/"));
}
