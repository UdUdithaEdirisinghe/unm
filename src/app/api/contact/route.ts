import { NextResponse } from "next/server";
import { sendContactEmail } from "../../../lib/mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // simple honeypot (blocks most bots)
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return j({ ok: true }); // pretend success
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = body.phone ? String(body.phone).trim() : "";
    const subject = body.subject ? String(body.subject).trim() : "";
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return j({ error: "Missing required fields." }, 400);
    }

    await sendContactEmail({ name, email, phone, subject, message });
    return j({ ok: true });
  } catch (e: any) {
    console.error("[api/contact] error:", e?.message || e);
    return j({ error: "Failed to send your message." }, 500);
  }
}