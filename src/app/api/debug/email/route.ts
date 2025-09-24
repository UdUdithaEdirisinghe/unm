// src/app/api/debug/email/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_DEBUG_TOKEN } = process.env;

async function sendTest(to: string) {
  const host = SMTP_HOST || "smtp.zoho.com";
  const port = Number(SMTP_PORT || 587);
  const secure = port === 465;

  const t = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    authMethod: "LOGIN",
    requireTLS: !secure,
    logger: true,
    debug: true,
  });

  await t.verify();

  const id = randomUUID().slice(0, 8);
  const info = await t.sendMail({
    from: `Manny.lk <${SMTP_USER}>`,       // must match SMTP_USER
    to,
    subject: `Debug mail OK — ${id}`,
    text: `Hello from Vercel. Message id: ${id}`,
    html: `<p>Hello from Vercel. Message id: <b>${id}</b></p>`,
  });

  return { messageId: info.messageId, response: info.response };
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("x-debug-token");
    if (!EMAIL_DEBUG_TOKEN || auth !== EMAIL_DEBUG_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const to = String(body?.to || SMTP_USER); // default to your mailbox
    if (!to) return NextResponse.json({ error: "Missing 'to'" }, { status: 400 });

    const res = await sendTest(to);
    return NextResponse.json({ ok: true, to, ...res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Send failed" }, { status: 500 });
  }
}
