import { NextRequest, NextResponse } from "next/server";

const COOKIE = "manny_admin";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // protect /admin (but allow /admin/login and /api/admin/*)
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const authed = req.cookies.get(COOKIE)?.value === "1";
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};