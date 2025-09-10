import { NextRequest, NextResponse } from "next/server";

const COOKIE = "manny_admin";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const ok = password === process.env.ADMIN_PASSWORD;
  const res = NextResponse.json({ ok }, { status: ok ? 200 : 401 });

  if (ok) {
    res.cookies.set(COOKIE, "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
  }
  return res;
}