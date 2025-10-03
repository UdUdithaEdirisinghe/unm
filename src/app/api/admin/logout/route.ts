import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE = "manny_admin";
const CSRF_COOKIE = "manny_csrf";

export async function POST(req: NextRequest) {
  const csrfHeader = req.headers.get("x-csrf-token") || "";
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value || "";

  const sameLength = csrfHeader.length > 0 && csrfHeader.length === csrfCookie.length;
  const timingSafeOk =
    sameLength &&
    crypto.timingSafeEqual(Buffer.from(csrfHeader, "utf8"), Buffer.from(csrfCookie, "utf8"));

  if (!timingSafeOk) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  // expire the admin cookie
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}