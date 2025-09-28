import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, verifyCsrfToken } from "../../../../lib/csrf";

const COOKIE = "manny_admin";

function safeStr(v: unknown) { return String(v ?? ""); }

export async function POST(req: NextRequest) {
  // 1) Parse JSON safely
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Bad JSON" }, { status: 400 });
  }

  const password = safeStr(body?.password).slice(0, 200).trim();
  if (!password) {
    return NextResponse.json({ message: "Missing password" }, { status: 400 });
  }

  // 2) CSRF: header must match signed cookie
  const headerToken = safeStr(req.headers.get("x-csrf-token"));
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value || "";
  const okCsrf = headerToken && cookieToken && headerToken === cookieToken && verifyCsrfToken(headerToken);
  if (!okCsrf) {
    return NextResponse.json({ message: "Invalid CSRF token" }, { status: 403 });
  }

  // 3) Check password (constant-time compare)
  const envPass = safeStr(process.env.ADMIN_PASSWORD);
  const passBuf = Buffer.from(password);
  const envBuf = Buffer.from(envPass);
  const sameLen = passBuf.length === envBuf.length;
  const valid = sameLen && crypto.timingSafeEqual(passBuf, envBuf);

  const ok = Boolean(valid);
  const res = NextResponse.json({ ok }, { status: ok ? 200 : 401 });

  if (ok) {
    // Hardened session cookie
    res.cookies.set(COOKIE, "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,     // 1 day
      secure: true,
      sameSite: "strict",
    });
  }
  return res;
}

import crypto from "crypto";