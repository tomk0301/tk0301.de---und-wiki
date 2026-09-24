import {
  createHmac,
  pbkdf2 as pbkdf2Callback,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const SESSION_TTL = 60 * 60 * 8;
const TRUSTED_DEVICE_TTL = 60 * 60 * 24 * 28;
const PASSWORD_ITERATIONS = 310_000;
const pbkdf2 = promisify(pbkdf2Callback);

function decodeBase32(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, time = Date.now()) {
  const counter = Math.floor(time / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyTotp(code: string, secret: string) {
  const clean = code.replace(/\s/g, "");
  return /^\d{6}$/.test(clean) &&
    [-1, 0, 1].some((step) => equal(clean, totp(secret, Date.now() + step * 30_000)));
}

export function generateTotpSecret() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(20);
  const bits = [...bytes].map((byte) => byte.toString(2).padStart(8, "0")).join("");
  let secret = "";
  for (let index = 0; index < bits.length; index += 5) {
    secret += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return secret;
}

export async function hashPassword(password: string) {
  if (password.length < 14) throw new Error("PASSWORD_TOO_SHORT");
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, PASSWORD_ITERATIONS, 32, "sha256");
  return `${PASSWORD_ITERATIONS}:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [iterationsRaw, salt, expected] = stored.split(":");
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !expected) return false;
  const hash = await pbkdf2(
    password,
    Buffer.from(salt, "base64url"),
    iterations,
    32,
    "sha256",
  );
  return equal(hash.toString("base64url"), expected);
}

export function signSession(userId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET fehlt");
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const encodedId = Buffer.from(userId, "utf8").toString("base64url");
  const payload = `${encodedId}.${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(value?: string) {
  if (!value || !process.env.SESSION_SECRET) return null;
  const [encodedId, expires, signature] = value.split(".");
  if (!encodedId || !expires || !signature || Number(expires) < Date.now() / 1000) return null;
  const expected = createHmac("sha256", process.env.SESSION_SECRET)
    .update(`${encodedId}.${expires}`)
    .digest("base64url");
  if (!equal(signature, expected)) return null;
  try {
    return Buffer.from(encodedId, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function signTrustedDevice(userId: string, deviceId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET fehlt");
  const expires = Math.floor(Date.now() / 1000) + TRUSTED_DEVICE_TTL;
  const payload = `trusted.${Buffer.from(userId, "utf8").toString("base64url")}.${Buffer.from(deviceId, "utf8").toString("base64url")}.${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyTrustedDevice(value?: string) {
  if (!value || !process.env.SESSION_SECRET) return null;
  const [kind, encodedId, encodedDevice, expires, signature] = value.split(".");
  if (kind !== "trusted" || !encodedId || !encodedDevice || !expires || !signature || Number(expires) < Date.now() / 1000) return null;
  const payload = `${kind}.${encodedId}.${encodedDevice}.${expires}`;
  const expected = createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");
  if (!equal(signature, expected)) return null;
  return { userId: Buffer.from(encodedId, "base64url").toString("utf8"), deviceId: Buffer.from(encodedDevice, "base64url").toString("utf8") };
}
