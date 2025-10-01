// src/lib/mail.ts
import nodemailer, { SendMailOptions } from "nodemailer";
import { createInvoicePdf } from "./invoice";

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
  createdAt: string;
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

/* ----------------- Items Table ----------------- */
const itemsTable = (items: Line[]) =>
  items
    .map(
      (i) => `
<tr>
  <td colspan="4" style="padding:12px 10px;border-bottom:1px solid #f1f5f9;">
    <div style="color:#0f172a;line-height:1.55;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(
      i.name
    )}</div>
    <div style="margin-top:4px;color:#334155;line-height:1.4;">
      <span style="display:inline-block;margin-right:12px;">Qty: ${i.quantity}</span>
      <span style="display:inline-block;margin-right:12px;">Price: ${money(i.price)}</span>
      <span style="display:inline-block;">Total: <b>${money(i.price * i.quantity)}</b></span>
    </div>
  </td>
</tr>`
    )
    .join("");

/* ----------------- Customer Email ----------------- */
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
<div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:16px">
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
      <p style="margin:6px 0 0;color:#334155"><b>A digital invoice (PDF) is attached for your records.</b></p>
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

/* ----------------- Admin Email ----------------- */
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

/* ----------------- Transport ----------------- */
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
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: secure ? undefined : { rejectUnauthorized: true },
  } as any);
  await t.verify();
  return t;
}
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cached) return cached;
  const host = SMTP_HOST || "smtp.zoho.com";
  const wantPort = Number(SMTP_PORT || 587);
  const wantSecure = wantPort === 465;
  cached = await makeTransport(host, wantPort, wantSecure);
  return cached;
}
async function reallySend(opts: SendMailOptions) {
  const t = await getTransporter();
  return await t.sendMail(opts);
}

/* ----------------- sendOrderEmails ----------------- */
export async function sendOrderEmails(order: OrderEmail) {
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  // 1) Customer email (customer variant PDF)
  try {
    const brand = SITE_NAME || "Manny.lk";
    let pdfCustomer: Buffer | null = null;
    try {
      pdfCustomer = await createInvoicePdf(order, brand, { variant: "customer" });
    } catch {
      pdfCustomer = null;
    }
    const custAttachments = pdfCustomer
      ? [{ filename: `invoice-${order.id}.pdf`, content: pdfCustomer, contentType: "application/pdf" }]
      : [];
    await reallySend({
      from: fromHeader,
      to: order.customer.email,
      subject: `Order Confirmation — ${order.id}`,
      html: renderCustomerEmail(order),
      attachments: custAttachments,
    });
  } catch (err: any) {
    console.error("[mail] customer email failed:", err?.message || err);
  }

  // 2) Admin email (admin variant PDF)
  try {
    const brand = SITE_NAME || "Manny.lk";
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await createInvoicePdf(order, brand, { variant: "admin" });
    } catch {
      pdfBuffer = null;
    }
    const attachments = pdfBuffer
      ? [{ filename: `invoice-${order.id}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
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

/* ----------------- Contact Email ----------------- */
type ContactPayload = { name: string; email: string; phone?: string; subject?: string; message: string };
export async function sendContactEmail(payload: ContactPayload) {
  const to = MAIL_TO_CONTACT || "info@manny.lk";
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  const brand = SITE_NAME || "Manny.lk";
  const safe = (s: string | undefined) =>
    (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const html = `
<div style="padding:24px;font-family:Inter,system-ui,sans-serif">
  <h2>New website inquiry</h2>
  <p>From: ${safe(payload.name)} &lt;${safe(payload.email)}&gt;</p>
  ${payload.phone ? `<p>Phone: ${safe(payload.phone)}</p>` : ""}
  ${payload.subject ? `<p>Subject: ${safe(payload.subject)}</p>` : ""}
  <pre>${safe(payload.message)}</pre>
</div>`;

  await reallySend({
    from: fromHeader,
    to,
    replyTo: payload.email,
    subject: `[Contact] ${payload.subject || "Message"} — ${payload.name || "Customer"}`,
    html,
  });
}

/* ----------------- Contact Reply ----------------- */
type ContactReplyPayload = { customer: ContactPayload; replyMessage: string };
function renderContactReplyEmail(p: ContactReplyPayload) {
  const brand = SITE_NAME || "Manny.lk";
  const safe = (s: string | undefined) =>
    (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  return `
<div style="padding:24px;font-family:Inter,system-ui,sans-serif">
  <h2>Here’s your response from ${brand}</h2>
  <div><b>Our reply:</b><br/>${safe(p.replyMessage)}</div>
  <hr/>
  <div><b>Your original message:</b><br/>${safe(p.customer.message)}</div>
</div>`;
}
export async function sendContactReplyEmail(p: ContactReplyPayload) {
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;
  await reallySend({
    from: fromHeader,
    to: p.customer.email,
    replyTo: MAIL_TO_CONTACT || "info@manny.lk",
    subject: `Thank you for your message — ${SITE_NAME || "Manny.lk"} Support`,
    html: renderContactReplyEmail(p),
  });
}
