import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateTotpSecret, hashPassword } from "./auth";

export type UserRole = "reader" | "admin";
export type User = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  totpSecret: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  allowedArticleIds?: string[];
};

const DATA_FILE =
  process.env.USER_DATA_PATH ||
  path.join(process.cwd(), ".wrangler", "wiki-users.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function validUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<User>;
  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    typeof user.displayName === "string" &&
    (user.role === "reader" || user.role === "admin") &&
    typeof user.passwordHash === "string" &&
    typeof user.totpSecret === "string" &&
    typeof user.active === "boolean" &&
    typeof user.createdAt === "string" &&
    typeof user.updatedAt === "string"
  );
}

async function persist(users: User[]) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporary = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(users, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, DATA_FILE);
}

async function initialAdmin(): Promise<User[]> {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (!passwordHash || !totpSecret) {
    throw new Error("Bestehende Admin-Zugangsdaten fehlen für die Migration.");
  }
  const now = new Date().toISOString();
  return [{
    id: "initial-admin",
    username: "admin",
    displayName: "Administrator",
    role: "admin",
    passwordHash,
    totpSecret,
    active: true,
    createdAt: now,
    updatedAt: now,
  }];
}

async function readAll() {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    if (!Array.isArray(parsed) || !parsed.every(validUser)) {
      throw new Error("Ungültiges Benutzerdatenformat");
    }
    return parsed as User[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const users = await initialAdmin();
    await persist(users);
    return users;
  }
}

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 48);
}

export async function listUsers() {
  return (await readAll()).sort((a, b) => a.username.localeCompare(b.username, "de"));
}

export async function getUserById(id: string) {
  return (await readAll()).find((user) => user.id === id);
}

export async function getUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  return (await readAll()).find((user) => user.username === normalized);
}

export async function createUser(input: {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}) {
  return serialized(async () => {
    const users = await readAll();
    const username = normalizeUsername(input.username);
    if (username.length < 3) throw new Error("USERNAME_INVALID");
    if (users.some((user) => user.username === username)) throw new Error("USERNAME_EXISTS");
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      username,
      displayName: input.displayName.trim().slice(0, 100),
      role: input.role,
      passwordHash: await hashPassword(input.password),
      totpSecret: generateTotpSecret(),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    if (!user.displayName) throw new Error("VALIDATION");
    users.push(user);
    await persist(users);
    return user;
  });
}

export async function updateUser(
  id: string,
  input: {
    displayName: string;
    role: UserRole;
    active: boolean;
    password?: string;
    resetTotp?: boolean;
    allowedArticleIds?: string[];
  },
  actingUserId: string,
) {
  return serialized(async () => {
    const users = await readAll();
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) throw new Error("NOT_FOUND");
    if (id === actingUserId && (!input.active || input.role !== "admin")) {
      throw new Error("SELF_LOCKOUT");
    }
    const activeAdmins = users.filter(
      (user) => user.active && user.role === "admin" && user.id !== id,
    ).length;
    if (users[index].role === "admin" && users[index].active && (!input.active || input.role !== "admin") && activeAdmins === 0) {
      throw new Error("LAST_ADMIN");
    }
    const updated: User = {
      ...users[index],
      displayName: input.displayName.trim().slice(0, 100),
      role: input.role,
      active: input.active,
      updatedAt: new Date().toISOString(),
      allowedArticleIds: input.allowedArticleIds || [],
    };
    if (!updated.displayName) throw new Error("VALIDATION");
    if (input.password) updated.passwordHash = await hashPassword(input.password);
    if (input.resetTotp) updated.totpSecret = generateTotpSecret();
    users[index] = updated;
    await persist(users);
    return updated;
  });
}

export async function deleteUser(id: string, actingUserId: string) {
  return serialized(async () => {
    const users = await readAll();
    const target = users.find((user) => user.id === id);
    if (!target) throw new Error("NOT_FOUND");
    if (id === actingUserId) throw new Error("SELF_LOCKOUT");
    if (
      target.active &&
      target.role === "admin" &&
      users.filter((user) => user.active && user.role === "admin").length === 1
    ) {
      throw new Error("LAST_ADMIN");
    }
    await persist(users.filter((user) => user.id !== id));
  });
}
