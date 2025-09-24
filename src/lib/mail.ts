// src/lib/mail.ts
import nodemailer, { SendMailOptions } from "nodemailer";

const {
  SMTP_HOST,          // e.g. smtp.zoho.com
  SMTP_PORT,          // "587" (STARTTLS) or "465" (SSL)
  SMTP_USER,          // mailbox (must be real or alias with SMTP permission)
  SMTP_PASS,          // Zoho app password
  MAIL_FROM,          // e.g. 'Manny.lk <support@manny.lk>' (ideally same as SMTP_USER)
  MAIL_TO_ORDERS,     // e.g. orders@manny.lk
} = process.env;

/* ----------------- types & helpers ----------------- */

type Line = { name: string; quantity: number; price: number; slug?: string };

type ShipToDifferent = {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
} | undefined;

export type OrderEmail = {
  id: string;
  createdAt: string; // ISO
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    postal?: string;
    notes?: string;
    shipToDifferent?: ShipToDifferent; // <-- NEW: carry through shipping address
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

// Always render date/time in Sri Lanka time to avoid server timezone issues
function lkDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(iso));
}

const itemsTable = (items: Line[]) =>
  items
    .map(
      (i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb">${i.name}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${money(i.price)}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${money(i.price * i.quantity)}</td>
    </tr>`
    )
    .join("");

function addressBlock(
  title: string,
  a: { name?: string; phone?: string; address?: string; city?: string; postal?: string; email?: string } | null
) {
  if (!a) return "";
  const lines: string[] = [];
  if (a.name) lines.push(a.name);
  if (a.address) lines.push(a.address);
  if (a.city || a.postal) lines.push([a.city, a.postal].filter(Boolean).join(" "));
  if (a.phone) lines.push(`Phone: ${a.phone}`);
  if (a.email) lines.push(`Email: ${a.email}`);

  return `
  <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-top:10px">
    <div style="font-weight:600;margin-bottom:6px">${title}</div>
    <div>${lines.map((l) => `${l}<br/>`).join("")}</div>
  </div>`;
}

function renderCustomerEmail(o: OrderEmail) {
  const billing = {
    name: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
    phone: o.customer.phone,
    address: o.customer.address,
    city: o.customer.city,
    postal: o.customer.postal,
    email: o.customer.email,
  };

  const shipping =
    o.customer.shipToDifferent &&
    (o.customer.shipToDifferent.address || o.customer.shipToDifferent.city)
      ? {
          name: o.customer.shipToDifferent.name || billing.name,
          phone: o.customer.shipToDifferent.phone,
          address: o.customer.shipToDifferent.address,
          city: o.customer.shipToDifferent.city,
          postal: o.customer.shipToDifferent.postal,
        }
      : null;

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 10px">Thank you for your order!</h2>
    <p style="margin:0 0 16px">Order <b>${o.id}</b> • Placed on ${lkDateTime(o.createdAt)}</p>

    <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e5e7eb;width:100%;margin:12px 0;border-radius:8px;overflow:hidden">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;background:#f8fafc">Item</th>
          <th style="text-align:center;padding:10px;border-bottom:1px solid #e5e7eb;background:#f8fafc">Qty</th>
          <th style="text-align:right;padding:10px;border-bottom:1px solid #e5e7eb;background:#f8fafc">Price</th>
          <th style="text-align:right;padding:10px;border-bottom:1px solid #e5e7eb;background:#f8fafc">Total</th>
        </tr>
      </thead>
      <tbody>${itemsTable(o.items)}</tbody>
    </table>

    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:260px">
        ${addressBlock("Billing", billing)}
        ${shipping ? addressBlock("Shipping", shipping) : ""}
        ${
          o.customer.notes
            ? `<div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-top:10px">
                 <div style="font-weight:600;margin-bottom:6px">Order Notes</div>
                 <div style="white-space:pre-wrap">${o.customer.notes}</div>
               </div>`
            : ""
        }
      </div>

      <div style="flex:1;min-width:220px">
        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px">
          <div style="display:flex;justify-content:space-between;margin:4px 0">
            <span>Subtotal</span><b>${money(o.subtotal)}</b>
          </div>
          ${
            o.promoDiscount
              ? `<div style="display:flex;justify-content:space-between;margin:4px 0">
                   <span>Discount ${o.promoCode ? `(${o.promoCode})` : ""}</span>
                   <b>-${money(o.promoDiscount)}</b>
                 </div>`
              : ""
          }
          <div style="display:flex;justify-content:space-between;margin:4px 0">
            <span>Shipping</span><b>${o.freeShipping ? "Free" : money(o.shipping)}</b>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0"/>
          <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:16px">
            <span>Grand Total</span><b>${money(o.total)}</b>
          </div>
        </div>

        <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-top:10px">
          <div><b>Payment:</b> ${o.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}</div>
          ${
            o.bankSlipUrl
              ? `<div>Bank Slip: <a href="${o.bankSlipUrl}">${o.bankSlipUrl}</a></div>`
              : ""
          }
        </div>
      </div>
    </div>

    <p style="margin-top:16px">
      We’ll email you tracking details once your order is on the way.<br/>
      Need help? Chat on WhatsApp or email <a href="mailto:info@manny.lk">info@manny.lk</a>.
    </p>

    <p style="margin-top:12px;color:#64748b;font-size:12px">© ${new Date().getFullYear()} Manny.lk. All rights reserved.</p>
  </div>`;
}

function renderAdminEmail(o: OrderEmail) {
  // Admin message keeps notes & both addresses too
  const billing = `${o.customer.firstName} ${o.customer.lastName}`.trim();
  const ship = o.customer.shipToDifferent;
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">New order received: ${o.id}</h2>
    <div>Time: ${lkDateTime(o.createdAt)}</div>
    <div>Payment: ${o.paymentMethod}${o.bankSlipUrl ? ` — Slip: ${o.bankSlipUrl}` : ""}</div>
    <div>Customer: ${billing} — ${o.customer.email}${o.customer.phone ? " / " + o.customer.phone : ""}</div>
    ${
      ship && (ship.address || ship.city)
        ? `<div style="margin-top:6px"><b>Ship To:</b> ${[ship.name, ship.address, [ship.city, ship.postal].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>`
        : ""
    }

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

    <div>Subtotal: <b>${money(o.subtotal)}</b> ${
      o.promoDiscount ? `| Discount: -${money(o.promoDiscount)} (${o.promoCode ?? "code"})` : ""
    } | Shipping: <b>${o.freeShipping ? "Free" : money(o.shipping)}</b> | Grand: <b>${money(o.total)}</b></div>
    ${o.customer.notes ? `<div style="margin-top:8px"><b>Notes:</b> ${o.customer.notes}</div>` : ""}
  </div>`;
}

/* ----------------- transport (verify + fallback) ----------------- */

let cached: nodemailer.Transporter | null = null;

async function makeTransport(host: string, port: number, secure: boolean) {
  const t = nodemailer.createTransport({
    host,
    port,
    secure,                // false for 587 (STARTTLS), true for 465 (SSL)
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
  // Make From align with authenticated mailbox (Zoho requirement)
  const fallbackFrom = `Manny.lk <${SMTP_USER}>`;
  const fromHeader =
    MAIL_FROM && String(MAIL_FROM).toLowerCase().includes(String(SMTP_USER).toLowerCase())
      ? MAIL_FROM
      : fallbackFrom;

  // customer email (ignore failure)
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

  // admin email (ignore failure)
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
