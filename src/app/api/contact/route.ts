// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import { sendContactEmail } from "../../../lib/mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const message = String(body?.message || "").trim();
    const phone = body?.phone ? String(body.phone).trim() : undefined;
    const subject = body?.subject ? String(body.subject).trim() : undefined;

    if (!name || !email || !message) {
      return j({ error: "Please fill name, email, and message." }, 400);
    }

    await sendContactEmail({ name, email, phone, subject, message });
    return j({ ok: true });
  } catch (e: any) {
    console.error("[contact] route failed:", e?.message || e);
    return j({ error: "Failed to send message. Please try again." }, 500);
  }
}