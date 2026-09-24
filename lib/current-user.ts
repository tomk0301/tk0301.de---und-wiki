import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "./auth";
import { getUserById, type User, type UserRole } from "./users";
import { secureUrl } from "./secure-url";

export async function getCurrentUser(): Promise<User | null> {
  const id = verifySession((await cookies()).get("tk_session")?.value);
  if (!id) return null;
  const user = await getUserById(id);
  return user?.active ? user : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(await secureUrl("/login"));
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireUser();
  if (role === "admin" && user.role !== "admin") {
    redirect(await secureUrl("/?error=forbidden"));
  }
  return user;
}
