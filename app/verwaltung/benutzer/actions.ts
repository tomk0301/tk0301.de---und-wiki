"use server";

import { redirect } from "next/navigation";
import { requireRole } from "../../../lib/current-user";
import { createUser, deleteUser, updateUser, type UserRole } from "../../../lib/users";
import { revokeDevice } from "../../../lib/devices";

function field(formData: FormData, name: string, max = 200) {
  return String(formData.get(name) || "").trim().slice(0, max);
}

function role(formData: FormData): UserRole {
  return formData.get("role") === "admin" ? "admin" : "reader";
}

function errorCode(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const known: Record<string, string> = {
    USERNAME_INVALID: "username",
    USERNAME_EXISTS: "exists",
    PASSWORD_TOO_SHORT: "password",
    VALIDATION: "validation",
    SELF_LOCKOUT: "self",
    LAST_ADMIN: "last-admin",
    NOT_FOUND: "not-found",
  };
  return known[code] || "unknown";
}

export async function createUserAction(formData: FormData) {
  await requireRole("admin");
  try {
    const user = await createUser({
      username: field(formData, "username", 48),
      displayName: field(formData, "displayName", 100),
      role: role(formData),
      password: String(formData.get("password") || ""),
    });
    redirect(`/verwaltung/benutzer/${user.id}?setup=created`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    redirect(`/verwaltung/benutzer/neu?error=${errorCode(error)}`);
  }
}

export async function updateUserAction(formData: FormData) {
  const actor = await requireRole("admin");
  const id = field(formData, "id", 80);
  const resetTotp = formData.get("resetTotp") === "yes";
  try {
    await updateUser(id, {
      displayName: field(formData, "displayName", 100),
      role: role(formData),
      active: formData.get("active") === "yes",
      password: String(formData.get("password") || "") || undefined,
      resetTotp,
      allowedArticleIds: formData.getAll("allowedArticleIds").map(String),
    }, actor.id);
    redirect(`/verwaltung/benutzer/${id}?saved=1${resetTotp ? "&setup=reset" : ""}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    redirect(`/verwaltung/benutzer/${id}?error=${errorCode(error)}`);
  }
}

export async function deleteUserAction(formData: FormData) {
  const actor = await requireRole("admin");
  const id = field(formData, "id", 80);
  if (formData.get("confirm") !== "yes") {
    redirect(`/verwaltung/benutzer/${id}?error=confirm`);
  }
  try {
    await deleteUser(id, actor.id);
    redirect("/verwaltung/benutzer?deleted=1");
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    redirect(`/verwaltung/benutzer/${id}?error=${errorCode(error)}`);
  }
}

export async function revokeDeviceAction(formData: FormData) {
  const actor = await requireRole("admin");
  const deviceId = field(formData, "deviceId", 80);
  const userId = field(formData, "userId", 80);
  await revokeDevice(deviceId, userId);
  redirect(`/verwaltung/benutzer/${userId}?revoked=1`);
}
