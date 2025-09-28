import { NextRequest, NextResponse } from "next/server";

const COOKIE = "manny_admin";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect /admin (but allow /admin/login)
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const authed = req.cookies.get(COOKIE)?.value === "1";
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // NOTE: /api/admin/csrf is intentionally NOT blocked by middleware.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};