// src/app/api/admin/csrf/route.ts
import { NextResponse } from "next/server";
import { createCsrfToken, CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS } from "../../../../lib/csrf";

export async function GET() {
  const token = createCsrfToken();
  const res = NextResponse.json({ token });
  res.cookies.set(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return res;
}