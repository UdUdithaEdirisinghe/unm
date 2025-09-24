import nodemailer, { SendMailOptions } from "nodemailer";

const {
  SMTP_HOST,          // e.g. smtp.zoho.com
  SMTP_PORT,          // "587" (STARTTLS) or "465" (SSL)
  SMTP_USER,          // mailbox (must be real or alias with SMTP permission)
  SMTP_PASS,          // Zoho app password
  MAIL_FROM,          // e.g. 'Manny.lk <support@manny.lk>'
  MAIL_TO_ORDERS,     // e.g. orders@manny.lk
  SITE_NAME,          // optional, e.g. "Manny.lk"
  MAIL_TO_CONTACT,    // optional, e.g. info@manny.lk
  NEXT_PUBLIC_WHATSAPP_PHONE, // optional, e.g. 947XXXXXXXX
} = process.env;

/* ----------------- types & helpers ----------------- */

type Line = { name: string; quantity: number; price: number; slug?: string };

export type OrderEmail = {
  id: string;
  createdAt: string;
  customer: {
    firstName: string; lastName: string; email: string;
    phone?: string; address: string; city: string; postal?: string; notes?: string;
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
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(v);

const itemsTable = (items: Line[]) =>
  items.map(i => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #f1f5f9">${i.name}</td>
      <td style="padding:10px;text-align:center;border-bottom:1px solid #f1f5f9">${i.quantity}</td>
      <td style="padding:10px;text-align:right;border-bottom:1px solid #f1f5f9">${money(i.price)}</td>
      <td style="padding:10px;text-align:right;border-bottom:1px solid #f1f5f9">${money(i.price * i.quantity)}</td>
    </tr>
  `).join("");

/* ----------------- customer email (new layout) ----------------- */

function renderCustomerEmail(o: OrderEmail) {
  const brand = SITE_NAME || "Manny.lk";
  const contactEmail = MAIL_TO_CONTACT || "info@manny.lk";
  const wa = (NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
  const waHref = wa ? `https://wa.me/${wa}` : null;

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#f6f8fb;padding:24px">
    <div style="max-width:640px;margin:0 auto">
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:16px">
        <h2 style="margin:0 0 6px;font-size:20px">Thank you for your order!</h2>
        <p style="margin:0;color:#334155">Your order <strong>${o.id}</strong> was received on ${new Date(o.createdAt).toLocaleString()}.</p>
      </div>

      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:16px">
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
          <div>Subtotal: <strong>${money(o.subtotal)}</strong></div>
          ${o.promoDiscount ? `<div>Discount ${o.promoCode ? `(${o.promoCode})` : ""}: <strong>-${money(o.promoDiscount)}</strong></div>` : ""}
          <div>Shipping: <strong>${o.freeShipping ? "Free" : money(o.shipping)}</strong></div>
          <div style="margin-top:8px;font-size:16px">Grand Total: <strong>${money(o.total)}</strong></div>
        </div>
      </div>

      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:6px">Billing</div>
        <div style="color:#334155;line-height:1.6">
          ${o.customer.firstName} ${o.customer.lastName}<br/>
          ${o.customer.address}, ${o.customer.city}${o.customer.postal ? " " + o.customer.postal : ""}<br/>
          ${o.customer.phone ? `Phone: ${o.customer.phone}<br/>` : ""}Email: ${o.customer.email}
        </div>
        <div style="margin-top:10px;color:#334155">
          <strong>Payment:</strong> ${o.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}
          ${o.bankSlipUrl ? ` — <a href="${o.bankSlipUrl}">Bank slip</a>` : ""}
        </div>
      </div>

      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc">
        <div style="font-weight:600;margin-bottom:6px">Need help?</div>
        <div style="color:#334155;line-height:1.6">
          If you have any questions,
          ${waHref ? `chat with us on <a href="${waHref}">WhatsApp</a>` : "chat with us on WhatsApp"}
          or email <a href="mailto:${contactEmail}">${contactEmail}</a>.
        </div>
      </div>

      <div style="text-align:center;color:#94a3b8;margin-top:16px;font-size:12px">
        © ${new Date().getFullYear()} ${brand}. All rights reserved.
      </div>
    </div>
  </div>`;
}

/* ----------------- admin email (unchanged) ----------------- */

function renderAdminEmail(o: OrderEmail) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">New order received: ${o.id}</h2>
    <div>Time: ${new Date(o.createdAt).toLocaleString()}</div>
    <div>Payment: ${o.paymentMethod}${o.bankSlipUrl ? ` — Slip: ${o.bankSlipUrl}` : ""}</div>
    <div>Customer: ${o.customer.firstName} ${o.customer.lastName} — ${o.customer.email}${o.customer.phone ? " / " + o.customer.phone : ""}</div>
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
    <div>Subtotal: <b>${money(o.subtotal)}</b> ${o.promoDiscount ? `| Discount: -${money(o.promoDiscount)} (${o.promoCode ?? "code"})` : ""} | Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b> | Grand: <b>${money(o.total)}</b></div>
    ${o.customer.notes ? `<div style="margin-top:8px"><b>Notes:</b> ${o.customer.notes}</div>` : ""}
  </div>`;
}

/* ----------------- transport (verify + fallback) ----------------- */

let cached: nodemailer.Transporter | null = null;

async function makeTransport(host: string, port: number, secure: boolean) {
  const t = nodemailer.createTransport({
    host,
    port,
    secure,
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
  console.log("[mail] sent:", { messageId: info.messageId, response: info.response, to: opts.to, subject: opts.subject });
  return info;
}

/* ----------------- public API ----------------- */

export async function sendOrderEmails(order: OrderEmail) {
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && String(MAIL_FROM).toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  // customer email
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

  // admin email
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
