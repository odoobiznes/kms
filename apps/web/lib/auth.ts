import { cookies } from "next/headers";
import crypto from "crypto";
import { getProfile } from "./db";

const SESSION_SECRET = process.env.SESSION_SECRET || "kms-session-secret-change-me";
const COOKIE_NAME = "kms_session";

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      resolve(salt + ":" + key.toString("hex"));
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex") === key);
    });
  });
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  const encoded = Buffer.from(payload).toString("base64url");
  return encoded + "." + hmac;
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const [encoded, hmac] = token.split(".");
    const payload = Buffer.from(encoded, "base64url").toString();
    const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    if (hmac !== expectedHmac) return null;
    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  const user = await getProfile(session.userId);
  return user;
}

export { COOKIE_NAME };
