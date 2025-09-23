// src/lib/mail.ts
import nodemailer, { SendMailOptions } from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,          // "587" (STARTTLS) or "465" (SSL)
  SMTP_USER,          // e.g. support@manny.lk  (Zoho user or alias enabled for SMTP)
  SMTP_PASS,          // Zoho "App Password" (not your login password)
  MAIL_FROM,          // e.g. 'Manny.lk <support@manny.lk>'
  MAIL_TO_ORDERS,     // e.g. orders@manny.lk
} = process.env;

type Line = { name: string; quantity: number; price: number; slug?: string };
type OrderEmail = {
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

function money(v: number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(v);
}

function itemsTable(items: Line[]) {
  return items.map(i => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb">${i.name}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${money(i.price)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${money(i.price * i.quantity)}</td>
    </tr>
  `).join("");
}

function renderCustomerEmail(o: OrderEmail) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">Thank you for your order!</h2>
    <p style="margin:0 0 16px">Your order <b>${o.id}</b> was received on ${new Date(o.createdAt).toLocaleString()}.</p>
    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;width:100%;margin:12px 0">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Item</th>
          <th style="text-align:center;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Qty</th>
          <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Price</th>
          <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Total</th>
        </tr>
      </thead>
      <tbody>${itemsTable(o.items)}</tbody>
    </table>
    <div style="margin:10px 0">
      <div>Subtotal: <b>${money(o.subtotal)}</b></div>
      ${o.promoDiscount ? `<div>Discount (${o.promoCode ?? "code"}): <b>-${money(o.promoDiscount)}</b></div>` : ""}
      <div>Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b></div>
      <div style="margin-top:6px;font-size:16px">Grand Total: <b>${money(o.total)}</b></div>
    </div>
    <div style="margin:14px 0">
      <div><b>Payment:</b> ${o.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}</div>
      ${o.bankSlipUrl ? `<div>Bank Slip: <a href="${o.bankSlipUrl}">${o.bankSlipUrl}</a></div>` : ""}
    </div>
    <p style="margin:18px 0 6px"><b>Billing</b><br/>
      ${o.customer.firstName} ${o.customer.lastName}<br/>
      ${o.customer.address}, ${o.customer.city}${o.customer.postal ? " " + o.customer.postal : ""}<br/>
      ${o.customer.phone ? "Phone: " + o.customer.phone + "<br/>" : ""}Email: ${o.customer.email}
    </p>
    <p style="margin-top:18px">We’ll notify you once your order is on the way.<br/>— Manny.lk</p>
  </div>`;
}

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
          <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Item</th>
          <th style="text-align:center;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Qty</th>
          <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Price</th>
          <th style="text-align:right;padding:8px;border:1px solid #e5e7eb;background:#f8fafc">Total</th>
        </tr>
      </thead>
      <tbody>${itemsTable(o.items)}</tbody>
    </table>
    <div>Subtotal: <b>${money(o.subtotal)}</b> ${o.promoDiscount ? `| Discount: -${money(o.promoDiscount)} (${o.promoCode ?? "code"})` : ""} | Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b> | Grand: <b>${money(o.total)}</b></div>
    ${o.customer.notes ? `<div style="margin-top:8px"><b>Notes:</b> ${o.customer.notes}</div>` : ""}
  </div>`;
}

/* ---------- Transport factory with fallback + debug ---------- */

let cached: nodemailer.Transporter | null = null;

async function makeTransport(
  host: string,
  port: number,
  secure: boolean
): Promise<nodemailer.Transporter> {
  const t = nodemailer.createTransport({
    host,
    port,
    secure,                  // false for 587 (STARTTLS), true for 465 (SSL)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    logger: true,            // log to console (shows in Vercel logs)
    debug: true,             // verbose SMTP convo
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: secure ? undefined : { rejectUnauthorized: true }, // STARTTLS upgrade
  });
  // Verify connection/auth early so failures are visible
  await t.verify();
  return t;
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cached) return cached;
  const host = SMTP_HOST || "smtp.zoho.com";
  const wantPort = Number(SMTP_PORT || 587);

  try {
    const secure = wantPort === 465;
    console.log(`[mail] trying SMTP ${host}:${wantPort} secure=${secure}`);
    cached = await makeTransport(host, wantPort, secure);
    console.log("[mail] SMTP verify OK on desired port");
    return cached;
  } catch (e1: any) {
    console.error("[mail] primary SMTP failed:", e1?.message || e1);
    // Fallback: try the other Zoho port
    const altPort = wantPort === 465 ? 587 : 465;
    const altSecure = altPort === 465;
    try {
      console.log(`[mail] trying fallback SMTP ${host}:${altPort} secure=${altSecure}`);
      cached = await makeTransport(host, altPort, altSecure);
      console.log("[mail] SMTP verify OK on fallback port");
      return cached;
    } catch (e2: any) {
      console.error("[mail] fallback SMTP failed:", e2?.message || e2);
      throw e2; // let caller log/catch
    }
  }
}

/* ---------- senders ---------- */

async function reallySend(opts: SendMailOptions) {
  const t = await getTransporter();
  const info = await t.sendMail(opts);
  console.log("[mail] sent:", { messageId: info.messageId, response: info.response, to: opts.to, subject: opts.subject });
  return info;
}

export async function sendOrderEmails(order: OrderEmail) {
  try {
    // customer email
    await reallySend({
      from: MAIL_FROM || `Manny.lk <${SMTP_USER}>`,
      to: order.customer.email,
      subject: `Order Confirmation — ${order.id}`,
      html: renderCustomerEmail(order),
    });
  } catch (err: any) {
    console.error("[mail] customer email failed:", err?.message || err);
  }

  try {
    // admin email
    await reallySend({
      from: MAIL_FROM || `Manny.lk <${SMTP_USER}>`,
      to: MAIL_TO_ORDERS || SMTP_USER,
      subject: `New Order — ${order.id} — ${order.customer.firstName} ${order.customer.lastName}`,
      html: renderAdminEmail(order),
    });
  } catch (err: any) {
    console.error("[mail] admin email failed:", err?.message || err);
  }
}