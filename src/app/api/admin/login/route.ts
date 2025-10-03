import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const AUTH_COOKIE = "manny_admin";
const CSRF_COOKIE = "manny_csrf";
const COOKIE_DOMAIN = process.env.VERCEL ? ".manny.lk" : undefined;

export async function POST(req: NextRequest) {
  // --- CSRF: double-submit cookie check ---
  const headerTok = req.headers.get("x-csrf-token") || "";
  const cookieTok = req.cookies.get(CSRF_COOKIE)?.value || "";

  const sameLength = headerTok.length > 0 && headerTok.length === cookieTok.length;
  const timingSafeOk =
    sameLength &&
    crypto.timingSafeEqual(
      Buffer.from(headerTok, "utf8"),
      Buffer.from(cookieTok, "utf8")
    );

  if (!timingSafeOk) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // --- Password check ---
  const { password } = await req.json();
  // Trim the env var to avoid stray whitespace/newlines in .env
  const envPwd = (process.env.ADMIN_PASSWORD ?? "").trim();

  // Helpful server-side log if not configured
  if (!envPwd) {
    console.warn("[admin/login] ADMIN_PASSWORD is not set or empty.");
  }

  const ok = password === envPwd;

  const res = NextResponse.json({ ok }, { status: ok ? 200 : 401 });

  if (ok) {
    res.cookies.set(AUTH_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      domain: COOKIE_DOMAIN,
      maxAge: 60 * 60 * 24, // 1 day
    });
  }
  return res;
}