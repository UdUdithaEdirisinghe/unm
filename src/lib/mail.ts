// src/lib/mail.ts
import nodemailer, { SendMailOptions } from "nodemailer";

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
  createdAt: string; // ISO string (DB/UTC is fine)
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

const itemsTable = (items: Line[]) =>
  items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${i.name}</td>
      <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #f1f5f9">${i.quantity}</td>
      <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #f1f5f9">${money(i.price)}</td>
      <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #f1f5f9">${money(
        i.price * i.quantity
      )}</td>
    </tr>
  `
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

/* ----------------- customer email ----------------- */

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
          ${o.customer.shipToDifferent.name ? o.customer.shipToDifferent.name + "<br/>" : ""}
          ${o.customer.shipToDifferent.address}, ${o.customer.shipToDifferent.city}${
        o.customer.shipToDifferent.postal ? " " + o.customer.shipToDifferent.postal : ""
      }<br/>
          ${
            o.customer.shipToDifferent.phone
              ? `Phone: ${o.customer.shipToDifferent.phone}`
              : ""
          }
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
          Your order <b>${o.id}</b> was received on ${fmtDate(o.createdAt)}.
        </p>
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
              ? `<div>Discount ${
                  o.promoCode ? `(${o.promoCode})` : ""
                }: <b>-${money(o.promoDiscount)}</b></div>`
              : ""
          }
          <div>Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b></div>
          <div style="margin-top:8px;font-size:16px">Grand Total: <b>${money(o.total)}</b></div>
        </div>
      </div>

      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:6px">Billing</div>
        <div style="color:#334155;line-height:1.6">
          ${o.customer.firstName} ${o.customer.lastName}<br/>
          ${o.customer.address}, ${o.customer.city}${
    o.customer.postal ? " " + o.customer.postal : ""
  }<br/>
          ${o.customer.phone ? `Phone: ${o.customer.phone}<br/>` : ""}Email: ${
    o.customer.email
  }
        </div>
        <div style="margin-top:10px;color:#334155">
          <b>Payment:</b> ${
            o.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"
          }${o.bankSlipUrl ? ` — <a href="${o.bankSlipUrl}">Bank slip</a>` : ""}
        </div>
      </div>

      ${shippingBlock}
      ${notesBlock}

      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc">
        <div style="font-weight:600;margin-bottom:6px">Need help?</div>
        <div style="color:#334155;line-height:1.6">
          If you have any questions,
          ${
            waHref
              ? `chat with us on <a href="${waHref}">WhatsApp</a>`
              : "chat with us on WhatsApp"
          }
          or email <a href="mailto:${contactEmail}">${contactEmail}</a>.
        </div>
      </div>

      <div style="text-align:center;color:#94a3b8;margin-top:16px;font-size:12px">
        © ${new Date().getFullYear()} ${brand}. All rights reserved.
      </div>

    </div>
  </div>`;
}

/* ----------------- admin email (now shows Shipping + Notes too) ----------------- */

function renderAdminEmail(o: OrderEmail) {
  const shippingLine = o.customer.shipToDifferent
    ? `<div><b>Ship to:</b> ${[
        o.customer.shipToDifferent.name,
        `${o.customer.shipToDifferent.address}, ${o.customer.shipToDifferent.city}${
          o.customer.shipToDifferent.postal ? " " + o.customer.shipToDifferent.postal : ""
        }`,
        o.customer.shipToDifferent.phone ? `Phone: ${o.customer.shipToDifferent.phone}` : "",
      ]
        .filter(Boolean)
        .join(" — ")}</div>`
    : "";

  const notesLine = o.customer.notes
    ? `<div style="margin-top:6px"><b>Notes:</b> ${escapeHtml(o.customer.notes)}</div>`
    : "";

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">New order received: ${o.id}</h2>
    <div>Time: ${fmtDate(o.createdAt)}</div>
    <div>Payment: ${o.paymentMethod}${o.bankSlipUrl ? ` — Slip: ${o.bankSlipUrl}` : ""}</div>
    <div>Customer: ${o.customer.firstName} ${o.customer.lastName} — ${o.customer.email}${
    o.customer.phone ? " / " + o.customer.phone : ""
  }</div>
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
    o.promoDiscount ? `| Discount: -${money(o.promoDiscount)} (${o.promoCode ?? "code"})` : ""
  } | Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b> | Grand: <b>${money(
    o.total
  )}</b></div>
  </div>`;
}

/* ----------------- transport (verify + fallback) ----------------- */

let cached: nodemailer.Transporter | null = null;

async function makeTransport(host: string, port: number, secure: boolean) {
  const t = nodemailer.createTransport({
    host,
    port,
    secure, // false for 587, true for 465
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    authMethod: "LOGIN",
    requireTLS: !secure,
    logger: true,
    debug: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: secure ? undefined : { rejectUnauthorized: true },
  });
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
    console.log(`[mail] trying fallback SMTP ${host}:${altPort} secure=${altSecure}`);
    cached = await makeTransport(host, altPort, altSecure);
    console.log("[mail] SMTP verify OK on fallback port");
    return cached;
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

/* ----------------- public API ----------------- */

export async function sendOrderEmails(order: OrderEmail) {
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && String(MAIL_FROM).toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

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

  try {
    await reallySend({
      from: fromHeader,
      to: MAIL_TO_ORDERS || SMTP_USER,
      subject: `New Order — ${order.id} — ${order.customer.firstName} ${order.customer.lastName}`,
      html: renderAdminEmail(order),
    });
  } catch (err: any) {
    console.error("[mail] admin email failed:", err?.message || err);
  }
}

/* ----------------- utils ----------------- */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
