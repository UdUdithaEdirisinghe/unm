// src/lib/mail.ts
import nodemailer, { SendMailOptions } from "nodemailer";
import { createInvoicePdf } from "./invoice"; // keep your invoice.ts as-is (it should return Buffer or throw)
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_TO_ORDERS,
  SITE_NAME,
  MAIL_TO_CONTACT,
  NEXT_PUBLIC_WHATSAPP_PHONE,
} = process.env;

/* ----------------- types & helpers ----------------- */

type Line = { name: string; quantity: number; price: number; slug?: string };

export type OrderEmail = {
  id: string;
  createdAt: string; // ISO string
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    postal?: string;
    notes?: string;
    shipToDifferent?: {
      name?: string;
      phone?: string;
      address: string;
      city: string;
      postal?: string;
    };
    /** present if you later wire the “Printed invoice” checkbox */
    wantsPrintedInvoice?: boolean;
  };
  items: Line[];
  subtotal: number;
  shipping: number;
  total: number;
  promoCode: string | null;
  promoDiscount: number | null;
  freeShipping: boolean;
  paymentMethod: "COD" | "BANK";
  bankSlipUrl?: string | null;
};

const money = (v: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(v);

/**
 * 🔧 CHANGED: bulletproof item rows for mobile clients.
 * Each item renders as ONE full-width cell (colspan=4) with:
 *  - line 1: name
 *  - line 2: Qty / Price / Total (inline text)
 * No multi-column numerics → avoids overlap on Gmail iOS/Android and Outlook.
 */
const itemsTable = (items: Line[]) =>
  items
    .map(
      (i, idx) => `
<tr>
  <td colspan="4" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;">
    <div style="color:#0f172a;line-height:1.55;word-break:break-word;overflow-wrap:anywhere;">
      ${escapeHtml(i.name)}
    </div>
    <div style="margin-top:4px;color:#334155;line-height:1.4;font-size:13px;white-space:nowrap;">
      <span style="margin-right:12px;">Qty: ${i.quantity}</span>
      <span style="margin-right:12px;">Price: ${money(i.price)}</span>
      <span>Total: <b>${money(i.price * i.quantity)}</b></span>
    </div>
  </td>
</tr>`
    )
    .join("");

// Always render in Sri Lanka local time
const LK_TZ = "Asia/Colombo";
function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: LK_TZ,
  }).format(new Date(d));
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ----------------- customer email (orders) ----------------- */

function renderCustomerEmail(o: OrderEmail) {
  const brand = SITE_NAME || "Manny.lk";
  const contactEmail = MAIL_TO_CONTACT || "info@manny.lk";
  const wa = (NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
  const waHref = wa ? `https://wa.me/${wa}` : null;

  const shippingBlock = o.customer.shipToDifferent
    ? `
<div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:16px">
  <div style="font-weight:600;margin-bottom:6px">Shipping</div>
  <div style="color:#334155;line-height:1.6">
    ${o.customer.shipToDifferent.name ? escapeHtml(o.customer.shipToDifferent.name) + "<br/>" : ""}
    ${escapeHtml(o.customer.shipToDifferent.address)}, ${escapeHtml(o.customer.shipToDifferent.city)}${
      o.customer.shipToDifferent.postal ? " " + escapeHtml(o.customer.shipToDifferent.postal) : ""
    }<br/>
    ${o.customer.shipToDifferent.phone ? `Phone: ${escapeHtml(o.customer.shipToDifferent.phone)}` : ""}
  </div>
</div>`
    : "";

  const notesBlock = o.customer.notes
    ? `
<div style="padding:16px;border:1px solid ${"#e5e7eb"};border-radius:8px;background:#fff;margin-bottom:16px">
  <div style="font-weight:600;margin-bottom:6px">Order notes</div>
  <div style="color:#334155;white-space:pre-wrap;line-height:1.6">
    ${escapeHtml(o.customer.notes)}
  </div>
</div>`
    : "";

  return `
<div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f8fb;padding:24px;color:#0f172a">
  <div style="max-width:640px;margin:0 auto">

    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:16px">
      <h2 style="margin:0 0 6px;font-size:20px">Thank you for your order!</h2>
      <p style="margin:0;color:#334155">
        Your order <b>${escapeHtml(o.id)}</b> was received on ${fmtDate(o.createdAt)}.
      </p>
      <p style="margin:6px 0 0;color:#334155"><b>Please find the attached digital invoice (PDF) for your records.</b></p>
    </div>

    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:16px">
      <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px;background:#f8fafc">Item</th>
            <th style="text-align:center;padding:10px;background:#f8fafc">Qty</th>
            <th style="text-align:right;padding:10px;background:#f8fafc">Price</th>
            <th style="text-align:right;padding:10px;background:#f8fafc">Total</th>
          </tr>
        </thead>
        <tbody>${itemsTable(o.items)}</tbody>
      </table>

      <div style="margin-top:12px;text-align:right;color:#334155">
        <div>Subtotal: <b>${money(o.subtotal)}</b></div>
        ${
          o.promoDiscount
            ? `<div>Discount ${o.promoCode ? `(${escapeHtml(o.promoCode)})` : ""}: <b>-${money(
                o.promoDiscount
              )}</b></div>`
            : ""
        }
        <div>Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b></div>
        <div style="margin-top:8px;font-size:16px">Grand Total: <b>${money(o.total)}</b></div>
      </div>
    </div>

    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:6px">Billing</div>
      <div style="color:#334155;line-height:1.6">
        ${escapeHtml(o.customer.firstName)} ${escapeHtml(o.customer.lastName)}<br/>
        ${escapeHtml(o.customer.address)}, ${escapeHtml(o.customer.city)}${
          o.customer.postal ? " " + escapeHtml(o.customer.postal) : ""
        }<br/>
        ${o.customer.phone ? `Phone: ${escapeHtml(o.customer.phone)}<br/>` : ""}Email: ${escapeHtml(
          o.customer.email
        )}
      </div>
      <div style="margin-top:10px;color:#334155">
        <b>Payment:</b> ${o.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}${
          o.bankSlipUrl ? ` — <a href="${o.bankSlipUrl}">Bank slip</a>` : ""
        }
      </div>
    </div>

    ${shippingBlock}
    ${notesBlock}

    <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc">
      <div style="font-weight:600;margin-bottom:6px">Need help?</div>
      <div style="color:#334155;line-height:1.6">
        If you have any questions, ${
          waHref ? `chat with us on <a href="${waHref}">WhatsApp</a>` : "chat with us on WhatsApp"
        } or email <a href="mailto:${contactEmail}">${contactEmail}</a>.
      </div>
    </div>

    <div style="text-align:center;color:#94a3b8;margin-top:16px;font-size:12px">
      ©️ ${new Date().getFullYear()} ${brand}. All rights reserved.
    </div>

  </div>
</div>`;
}

/* ----------------- admin email (orders) ----------------- */

function renderAdminEmail(o: OrderEmail) {
  const shippingLine = o.customer.shipToDifferent
    ? `<div><b>Ship to:</b> ${[
        o.customer.shipToDifferent.name ? escapeHtml(o.customer.shipToDifferent.name) : "",
        `${escapeHtml(o.customer.shipToDifferent.address)}, ${escapeHtml(o.customer.shipToDifferent.city)}${
          o.customer.shipToDifferent.postal ? " " + escapeHtml(o.customer.shipToDifferent.postal) : ""
        }`,
        o.customer.shipToDifferent.phone ? `Phone: ${escapeHtml(o.customer.shipToDifferent.phone)}` : "",
      ]
        .filter(Boolean)
        .join(" — ")}</div>`
    : "";

  const notesLine = o.customer.notes
    ? `<div style="margin-top:6px"><b>Notes:</b> ${escapeHtml(o.customer.notes)}</div>`
    : "";

  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <h2 style="margin:0 0 8px">New order received: ${escapeHtml(o.id)}</h2>
  <div>Time: ${fmtDate(o.createdAt)}</div>
  <div>Payment: ${o.paymentMethod}${o.bankSlipUrl ? ` — Slip: ${o.bankSlipUrl}` : ""}</div>
  <div>Customer: ${escapeHtml(o.customer.firstName)} ${escapeHtml(o.customer.lastName)} — ${escapeHtml(
    o.customer.email
  )}${o.customer.phone ? " / " + escapeHtml(o.customer.phone) : ""}</div>
  ${shippingLine}
  ${notesLine}
  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;width:100%;margin:12px 0">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px;background:#f8fafc">Item</th>
        <th style="text-align:center;padding:8px;background:#f8fafc">Qty</th>
        <th style="text-align:right;padding:8px;background:#f8fafc">Price</th>
        <th style="text-align:right;padding:8px;background:#f8fafc">Total</th>
      </tr>
    </thead>
    <tbody>${itemsTable(o.items)}</tbody>
  </table>
  <div>Subtotal: <b>${money(o.subtotal)}</b> ${
    o.promoDiscount ? `| Discount: -${money(o.promoDiscount)} (${escapeHtml(o.promoCode ?? "code")})` : ""
  } | Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b> | Grand: <b>${money(o.total)}</b></div>
</div>`;
}

/* ----------------- transport (verify + fallback) ----------------- */

let cached: nodemailer.Transporter | null = null;

async function makeTransport(host: string, port: number, secure: boolean) {
  const t = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    authMethod: "LOGIN",
    requireTLS: !secure,
    logger: true,
    debug: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: secure ? undefined : { rejectUnauthorized: true },
  } as any);
  // verify may throw (network / auth). Let caller handle errors.
  await t.verify();
  return t;
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cached) return cached;
  const host = SMTP_HOST || "smtp.zoho.com";
  const wantPort = Number(SMTP_PORT || 587);
  const wantSecure = wantPort === 465;

  try {
    console.log(`[mail] trying SMTP ${host}:${wantPort} secure=${wantSecure}`);
    cached = await makeTransport(host, wantPort, wantSecure);
    console.log("[mail] SMTP verify OK on desired port");
    return cached;
  } catch (e1: any) {
    console.error("[mail] primary SMTP failed:", e1?.message || e1);
    const altPort = wantPort === 465 ? 587 : 465;
    const altSecure = altPort === 465;
    try {
      console.log(`[mail] trying fallback SMTP ${host}:${altPort} secure=${altSecure}`);
      cached = await makeTransport(host, altPort, altSecure);
      console.log("[mail] SMTP verify OK on fallback port");
      return cached;
    } catch (e2: any) {
      console.error("[mail] fallback SMTP also failed:", e2?.message || e2);
      throw e2;
    }
  }
}

async function reallySend(opts: SendMailOptions) {
  const t = await getTransporter();
  const info = await t.sendMail(opts);
  console.log("[mail] sent:", {
    messageId: info.messageId,
    response: info.response,
    to: opts.to,
    subject: opts.subject,
  });
  return info;
}

/* ----------------- public API (orders) ----------------- */

export async function sendOrderEmails(order: OrderEmail) {
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  // 1) Customer email (unchanged)
  try {
    await reallySend({
      from: fromHeader,
      to: order.customer.email,
      subject: `Order Confirmation — ${order.id}`,
      html: renderCustomerEmail(order),
    });
  } catch (err: any) {
    console.error("[mail] customer email failed:", err?.message || err);
  }

  // 2) Admin email + PDF invoice attachment
  try {
    const brand = SITE_NAME || "Manny.lk";

    // createInvoicePdf may throw (fontkit/TTF issues or runtime). We guard.
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await createInvoicePdf(order, brand);
    } catch (pdfErr: any) {
      console.error("[mail] createInvoicePdf failed (falling back to no-attachment):", pdfErr?.message || pdfErr);
      pdfBuffer = null;
    }

    const attachments = pdfBuffer
      ? [
          {
            filename: `invoice-${order.id}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : [];

    await reallySend({
      from: fromHeader,
      to: MAIL_TO_ORDERS || SMTP_USER,
      subject: `New Order — ${order.id} — ${order.customer.firstName} ${order.customer.lastName}`,
      html: renderAdminEmail(order),
      attachments,
    });
  } catch (err: any) {
    console.error("[mail] admin email failed:", err?.message || err);
  }
}

/* ----------------- contact email (admin notify) ----------------- */

type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

export async function sendContactEmail(payload: ContactPayload) {
  const to = MAIL_TO_CONTACT || "info@manny.lk";
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  const brand = SITE_NAME || "Manny.lk";
  const primary = "#111827";
  const subText = "#4b5563";
  const border = "#e5e7eb";
  const bg = "#ffffff";

  const safe = (s: string | undefined) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const html = `
<div style="margin:0;padding:24px;background:${bg};color:${primary};font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};margin-bottom:16px;">
      <h2 style="margin:0 0 6px;font-size:20px;color:${primary};">New website inquiry</h2>
      <div style="margin:0;color:${subText};">${brand}</div>
    </div>

    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};margin-bottom:12px;">
      <div style="font-weight:600;margin-bottom:6px;color:${primary};">From</div>
      <div style="color:${subText};">${safe(payload.name) || "-"}</div>
      <div style="margin-top:2px;">
        <a href="mailto:${safe(payload.email)}" style="text-decoration:none;color:#2563eb;">${safe(
          payload.email
        ) || "-"}</a>
      </div>
      <div style="margin-top:8px;">
        <a href="mailto:${safe(payload.email)}?subject=Re:%20${encodeURIComponent(
          payload.subject || "Your message to " + brand
        )}"
          style="display:inline-block;padding:8px 10px;border:1px solid ${border};border-radius:8px;text-decoration:none;color:#2563eb;">
          Reply to customer
        </a>
      </div>
    </div>

    ${
      payload.subject
        ? `
    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};margin-bottom:12px;">
      <div style="font-weight:600;margin-bottom:6px;color:${primary};">Subject</div>
      <div style="color:${subText};">${safe(payload.subject)}</div>
    </div>`
        : ""
    }

    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};">
      <div style="font-weight:600;margin-bottom:6px;color:${primary};">Message</div>
      <div style="white-space:pre-wrap;color:${primary};">${safe(payload.message)}</div>
    </div>

    <div style="text-align:center;color:#9ca3af;margin-top:16px;font-size:12px;">
      ©️ ${new Date().getFullYear()} ${brand}. All rights reserved.
    </div>
  </div>
</div>`;

  try {
    const t = await getTransporter();
    await t.sendMail({
      from: fromHeader,
      to,
      replyTo: payload.email,
      subject: `[Contact] ${payload.subject || "Message"} — ${payload.name || "Customer"}`,
      html,
    });
  } catch (err: any) {
    console.error("[contact] send failed:", err?.message || err);
    throw err;
  }
}

/* ---------- Customer reply email (team → customer) ---------- */

type ContactReplyPayload = {
  customer: ContactPayload; // includes name, email, subject?, message (original)
  replyMessage: string; // what your team wrote
};

function renderContactReplyEmail(p: ContactReplyPayload) {
  const brand = SITE_NAME || "Manny.lk";
  const contactEmail = MAIL_TO_CONTACT || "info@manny.lk";
  const wa = (NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
  const waHref = wa ? `https://wa.me/${wa}` : null;

  const primary = "#111827";
  const subText = "#4b5563";
  const border = "#e5e7eb";
  const bg = "#ffffff";

  const safe = (s: string | undefined) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  return `
<div style="margin:0;padding:24px;background:${bg};color:${primary};font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
  <div style="max-width:640px;margin:0 auto;">

    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};margin-bottom:16px;">
      <h2 style="margin:0 0 6px;font-size:20px;color:${primary};">Here’s your response from ${brand}</h2>
    </div>

    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};margin-bottom:12px;">
      <div style="font-weight:600;margin-bottom:6px;color:${primary};">Our reply</div>
      <div style="white-space:pre-wrap;color:${primary};">${safe(p.replyMessage)}</div>
    </div>

    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:${bg};margin-bottom:12px;">
      <div style="font-weight:600;margin-bottom:6px;color:${primary};">Your original message</div>
      ${p.customer.subject ? `<div style="color:${subText};margin-bottom:6px;"><b>Subject:</b> ${safe(
        p.customer.subject
      )}</div>` : ""}
      <div style="white-space:pre-wrap;color:${subText};">${safe(p.customer.message)}</div>
    </div>

    <div style="padding:16px;border:1px solid ${border};border-radius:10px;background:#f8fafc;">
      <div style="font-weight:600;margin-bottom:6px;color:${primary};">Need more help?</div>
      <div style="color:${subText};">
        Just reply to this email and it will reach us directly.${waHref ? ` Or message us on <a href="${waHref}" style="text-decoration:none;color:#2563eb;">WhatsApp</a>.` : ""}
      </div>
    </div>

    <div style="text-align:center;color:#9ca3af;margin-top:16px;font-size:12px;">
      ©️ ${new Date().getFullYear()} ${brand}. All rights reserved · <a href="mailto:${contactEmail}" style="text-decoration:none;color:#2563eb;">${contactEmail}</a>
    </div>

  </div>
</div>`;
}

export async function sendContactReplyEmail(p: ContactReplyPayload) {
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  try {
    const t = await getTransporter();
    await t.sendMail({
      from: fromHeader,
      to: p.customer.email,
      replyTo: MAIL_TO_CONTACT || "info@manny.lk",
      subject: `Thank you for your message — ${SITE_NAME || "Manny.lk"} Support`,
      html: renderContactReplyEmail(p),
    });
    console.log("[contact reply] sent to", p.customer.email);
  } catch (err: any) {
    console.error("[contact reply] send failed:", err?.message || err);
    throw err;
  }
}
