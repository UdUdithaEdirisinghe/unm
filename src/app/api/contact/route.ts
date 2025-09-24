// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import { sendContactEmail } from "../../../lib/mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name = "", email = "", subject = "", message = "", company = "" } = body || {};

    // Basic validation
    const okEmail = typeof email === "string" && /\S+@\S+\.\S+/.test(email);
    if (!name || !okEmail || !subject || !message) {
      return j({ error: "Please fill all required fields." }, 400);
    }
    // Honeypot check
    if (company) return j({ ok: true }); // silently ignore bots

    await sendContactEmail({
      name: String(name),
      email: String(email),
      subject: String(subject),
      message: String(message),
    });

    return j({ ok: true });
  } catch (e: any) {
    console.error("contact route error:", e);
    return j({ error: "Failed to send message." }, 500);
  }
}