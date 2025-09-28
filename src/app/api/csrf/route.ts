// src/app/api/csrf/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CSRF_COOKIE = "manny_csrf";

export async function GET(req: NextRequest) {
  let token = req.cookies.get(CSRF_COOKIE)?.value;

  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
  }

  const res = NextResponse.json({ token });

  // set cookie if not present
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,   // must be readable by frontend
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60,   // 1 hour
  });

  return res;
}