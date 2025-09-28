// src/app/api/csrf/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CSRF_COOKIE = "manny_csrf";
// Use a domain only in production; in dev keep it undefined.
const COOKIE_DOMAIN = process.env.VERCEL ? ".manny.lk" : undefined;

export async function GET(_req: NextRequest) {
  // plain random, URL-safe token (must match what we’ll compare against)
  const token = crypto.randomBytes(24).toString("base64url");

  const res = NextResponse.json({ token });
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,      // must be readable by JS for double-submit
    secure: true,
    sameSite: "lax",
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 60 * 60,      // 1 hour
  });

  return res;
}