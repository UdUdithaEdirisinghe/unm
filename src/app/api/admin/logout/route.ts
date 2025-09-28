import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, verifyCsrfToken } from "../../../../lib/csrf";

const COOKIE = "manny_admin";

export async function POST(req: NextRequest) {
  // Require CSRF for logout too
  const headerToken = String(req.headers.get("x-csrf-token") || "");
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value || "";
  const okCsrf = headerToken && cookieToken && headerToken === cookieToken && verifyCsrfToken(headerToken);
  if (!okCsrf) {
    return NextResponse.json({ message: "Invalid CSRF token" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, secure: true, sameSite: "strict" });
  return res;
}