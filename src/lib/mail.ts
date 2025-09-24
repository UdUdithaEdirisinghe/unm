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

  // Optional DKIM (safe if unset)
  DKIM_DOMAIN,
  DKIM_SELECTOR,
  DKIM_PRIVATE_KEY,
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

// HTML escape for ANY user-provided string
function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const itemsTable = (items: Line[]) =>
  items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #1f2937">${escapeHtml(i.name)}</td>
      <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #1f2937">${i.quantity}</td>
      <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #1f2937">${money(i.price)}</td>
      <td style="padding:8px 10px;text-align:right;border-bottom:1px solid #1f2937">${money(
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

function a(href: string, text: string) {
  // brand color link, no underline
  return `<a href="${href}" style="color:#6366f1;text-decoration:none">${escapeHtml(text)}</a>`;
}

function brandName() {
  return SITE_NAME || "Manny.lk";
}

function getFromHeader() {
  const fallback = `Manny.lk <${SMTP_USER}>`;
  return MAIL_FROM && SMTP_USER && MAIL_FROM.toLowerCase().includes(SMTP_USER.toLowerCase())
    ? MAIL_FROM
    : fallback;
}

function getWhatsAppHref() {
  const wa = (NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
  return wa ? `https://wa.me/${wa}` : null;
}

/* ----------------- ORDER: customer email ----------------- */

function renderCustomerEmail(o: OrderEmail) {
  const brand = brandName();
  const contactEmail = MAIL_TO_CONTACT || "info@manny.lk";
  const waHref = getWhatsAppHref();

  const shippingBlock = o.customer.shipToDifferent
    ? `
      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:6px;color:#e2e8f0">Shipping</div>
        <div style="color:#94a3b8;line-height:1.6">
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
      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:6px;color:#e2e8f0">Order notes</div>
        <div style="color:#94a3b8;white-space:pre-wrap;line-height:1.6">
          ${escapeHtml(o.customer.notes)}
        </div>
      </div>`
    : "";

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1220;padding:24px;color:#e2e8f0">
    <div style="max-width:640px;margin:0 auto">

      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <h2 style="margin:0 0 6px;font-size:20px;color:#e2e8f0">Thank you for your order!</h2>
        <p style="margin:0;color:#94a3b8">
          Your order <b style="color:#e2e8f0">${escapeHtml(o.id)}</b> was received on ${fmtDate(o.createdAt)}.
        </p>
      </div>

      <div style="padding:0;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;padding:10px;background:#111827;color:#cbd5e1">Item</th>
              <th style="text-align:center;padding:10px;background:#111827;color:#cbd5e1">Qty</th>
              <th style="text-align:right;padding:10px;background:#111827;color:#cbd5e1">Price</th>
              <th style="text-align:right;padding:10px;background:#111827;color:#cbd5e1">Total</th>
            </tr>
          </thead>
          <tbody>${itemsTable(o.items)}</tbody>
        </table>

        <div style="padding:12px 16px;text-align:right;color:#94a3b8">
          <div>Subtotal: <b style="color:#e2e8f0">${money(o.subtotal)}</b></div>
          ${
            o.promoDiscount
              ? `<div>Discount ${o.promoCode ? `(${escapeHtml(o.promoCode)})` : ""}: <b style="color:#e2e8f0">-${money(o.promoDiscount)}</b></div>`
              : ""
          }
          <div>Shipping: <b style="color:#e2e8f0">${o.freeShipping ? "Free" : money(o.shipping)}</b></div>
          <div style="margin-top:8px;font-size:16px;color:#e2e8f0">Grand Total: <b>${money(o.total)}</b></div>
        </div>
      </div>

      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:6px;color:#e2e8f0">Billing</div>
        <div style="color:#94a3b8;line-height:1.6">
          ${escapeHtml(o.customer.firstName)} ${escapeHtml(o.customer.lastName)}<br/>
          ${escapeHtml(o.customer.address)}, ${escapeHtml(o.customer.city)}${o.customer.postal ? " " + escapeHtml(o.customer.postal) : ""}<br/>
          ${o.customer.phone ? `Phone: ${escapeHtml(o.customer.phone)}<br/>` : ""}Email: ${escapeHtml(o.customer.email)}
        </div>
        <div style="margin-top:10px;color:#94a3b8">
          <b style="color:#e2e8f0">Payment:</b> ${o.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}${o.bankSlipUrl ? ` — ${a(o.bankSlipUrl, "Bank slip")}` : ""}
        </div>
      </div>

      ${shippingBlock}
      ${notesBlock}

      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a">
        <div style="font-weight:600;margin-bottom:6px;color:#e2e8f0">Need help?</div>
        <div style="color:#94a3b8;line-height:1.6">
          If you have any questions, ${waHref ? `chat with us on ${a(waHref, "WhatsApp")}` : "chat with us on WhatsApp"} or email ${a(`mailto:${contactEmail}`, contactEmail)}.
        </div>
      </div>

      <div style="text-align:center;color:#64748b;margin-top:16px;font-size:12px">
        © ${new Date().getFullYear()} ${escapeHtml(brand)}. All rights reserved.
      </div>
    </div>
  </div>`;
}

/* ----------------- ORDER: admin email ----------------- */

function renderAdminEmail(o: OrderEmail) {
  const shippingLine = o.customer.shipToDifferent
    ? `<div><b>Ship to:</b> ${[
        o.customer.shipToDifferent.name && escapeHtml(o.customer.shipToDifferent.name),
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
    <div>Payment: ${o.paymentMethod}${o.bankSlipUrl ? ` — ${a(o.bankSlipUrl, "Slip")}` : ""}</div>
    <div>Customer: ${escapeHtml(o.customer.firstName)} ${escapeHtml(o.customer.lastName)} — ${escapeHtml(o.customer.email)}${
    o.customer.phone ? " / " + escapeHtml(o.customer.phone) : ""
  }</div>
    ${shippingLine}
    ${notesLine}
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #1f2937;width:100%;margin:12px 0">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;background:#111827;color:#cbd5e1">Item</th>
          <th style="text-align:center;padding:8px;background:#111827;color:#cbd5e1">Qty</th>
          <th style="text-align:right;padding:8px;background:#111827;color:#cbd5e1">Price</th>
          <th style="text-align:right;padding:8px;background:#111827;color:#cbd5e1">Total</th>
        </tr>
      </thead>
      <tbody>${itemsTable(o.items)}</tbody>
    </table>
    <div>Subtotal: <b>${money(o.subtotal)}</b> ${
    o.promoDiscount ? `| Discount: -${money(o.promoDiscount)} (${o.promoCode ? escapeHtml(o.promoCode) : "code"})` : ""
  } | Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b> | Grand: <b>${money(o.total)}</b></div>
  </div>`;
}

/* ----------------- CONTACT email (admin side) ----------------- */

type ContactPayload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

function renderContactToAdmin(p: ContactPayload) {
  const brand = brandName();
  const replyHref = `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(`Re: ${p.subject || "Inquiry"}`)}`;

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1220;padding:24px;color:#e2e8f0">
    <div style="max-width:640px;margin:0 auto">

      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <h2 style="margin:0 0 6px;font-size:20px;color:#e2e8f0">New website inquiry</h2>
        <p style="margin:0;color:#94a3b8">${escapeHtml(brand)}</p>
      </div>

      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;margin-bottom:16px">
        <div style="color:#94a3b8">From</div>
        <div style="color:#e2e8f0;font-weight:600">${escapeHtml(p.name || "Customer")}</div>
        <div style="margin-top:4px">${a(`mailto:${p.email}`, p.email)}</div>
        <div style="margin-top:8px">${a(replyHref, "Reply to customer")}</div>
      </div>

      <div style="padding:16px;border:1px solid #1f2937;border-radius:8px;background:#0f172a">
        <div style="font-weight:600;margin-bottom:6px;color:#e2e8f0">Message</div>
        <div style="color:#94a3b8;white-space:pre-wrap;line-height:1.7">${escapeHtml(p.message)}</div>
      </div>
    </div>
  </div>`;
}

/* ----------------- SMTP transport (verify + fallback + optional DKIM) ----------------- */

let cached: nodemailer.Transporter | null = null;

function dkimConfig() {
  if (!DKIM_DOMAIN || !DKIM_SELECTOR || !DKIM_PRIVATE_KEY) return undefined;
  return {
    domainName: DKIM_DOMAIN,
    keySelector: DKIM_SELECTOR,
    privateKey: DKIM_PRIVATE_KEY,
  };
}

async function makeTransport(host: string, port: number, secure: boolean) {
  const t = nodemailer.createTransport({
    host,
    port,
    secure,                      // false for 587 (STARTTLS), true for 465 (SSL)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    authMethod: "LOGIN",
    requireTLS: !secure,         // force STARTTLS on 587
    logger: true,
    debug: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: secure ? undefined : { rejectUnauthorized: true },
    dkim: dkimConfig(),          // optional; only used if envs set
  });
  await t.verify();              // show auth/config issues early
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
  // ensure text alternative for better deliverability
  const plain =
    (opts.text as string | undefined) ||
    (opts.html ? String(opts.html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : undefined);

  const info = await t.sendMail({ ...opts, text: plain });
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
  const fromHeader = getFromHeader();

  try {
    await reallySend({
      from: fromHeader,
      to: order.customer.email,
      subject: `Order Confirmation — ${escapeHtml(order.id)}`,
      html: renderCustomerEmail(order),
    });
  } catch (err: any) {
    console.error("[mail] customer email failed:", err?.message || err);
  }

  try {
    await reallySend({
      from: fromHeader,
      to: MAIL_TO_ORDERS || SMTP_USER,
      subject: `New Order — ${escapeHtml(order.id)} — ${escapeHtml(
        `${order.customer.firstName} ${order.customer.lastName}`.trim()
      )}`,
      html: renderAdminEmail(order),
    });
  } catch (err: any) {
    console.error("[mail] admin email failed:", err?.message || err);
  }
}

export async function sendContactEmail(payload: ContactPayload) {
  const to = MAIL_TO_CONTACT || "info@manny.lk";
  const fromHeader = getFromHeader();

  try {
    await reallySend({
      from: fromHeader,
      to,
      replyTo: payload.email, // reply goes straight to the customer
      subject: `[Contact] ${escapeHtml(payload.subject || "Message")} — ${escapeHtml(payload.name || "Customer")}`,
      html: renderContactToAdmin(payload),
    });
    console.log("[contact] sent to", to);
  } catch (err: any) {
    console.error("[contact] send failed:", err?.message || err);
    throw err;
  }
}
