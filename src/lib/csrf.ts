// src/lib/csrf.ts
import crypto from "crypto";

const CSRF_COOKIE = "manny_csrf";
const ALG = "sha256";

/** Build HMAC(token) so a client can’t forge a token value. */
function sign(value: string, secret: string) {
  return crypto.createHmac(ALG, secret).update(value).digest("base64url");
}

/** Create a random token + signature. */
export function createCsrfToken(secret = process.env.CSRF_SECRET || "") {
  if (!secret) throw new Error("CSRF_SECRET is not set");
  const raw = crypto.randomBytes(24).toString("base64url"); // random nonce
  const sig = sign(raw, secret);
  return `${raw}.${sig}`;
}

/** Verify structure + HMAC. */
export function verifyCsrfToken(token: string | undefined | null, secret = process.env.CSRF_SECRET || ""): boolean {
  if (!secret || !token) return false;
  const [raw, sig] = String(token).split(".");
  if (!raw || !sig) return false;

  const expected = sign(raw, secret);
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Cookie options reused in routes. */
export const CSRF_COOKIE_NAME = CSRF_COOKIE;
export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,       // double-submit cookie must be readable by JS
  secure: true,          // only over HTTPS
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60,       // 1 hour
};