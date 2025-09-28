// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE = "manny_admin";
const CSRF_COOKIE = "manny_csrf";

export async function POST(req: NextRequest) {
  const csrfHeader = req.headers.get("x-csrf-token") || "";
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value || "";

  // timing-safe compare
  if (
    !csrfHeader ||
    !csrfCookie ||
    !crypto.timingSafeEqual(
      Buffer.from(csrfHeader),
      Buffer.from(csrfCookie)
    )
  ) {
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 }
    );
  }

  const { password } = await req.json();
  const ok = password === process.env.ADMIN_PASSWORD;
  const res = NextResponse.json({ ok }, { status: ok ? 200 : 401 });

  if (ok) {
    res.cookies.set(COOKIE, "1", {
      httpOnly: true,
      path: "/",
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });
  }
  return res;
}