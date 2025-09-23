// src/lib/mail.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO_ORDERS,
} = process.env;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(SMTP_PORT || 587);

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // SSL for 465, STARTTLS for 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    requireTLS: port === 587, // force STARTTLS on 587
    tls: { minVersion: "TLSv1.2" },
  });

  return transporter;
}

type Line = { name: string; quantity: number; price: number; slug?: string };
type OrderEmail = {
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
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(v);
}

function itemsTable(items: Line[]) {
  return items
    .map(
      (i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #e5e7eb">${i.name}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${money(
        i.price
      )}</td>
      <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${money(
        i.price * i.quantity
      )}</td>
    </tr>
  `
    )
    .join("");
}

function renderCustomerEmail(o: OrderEmail) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">Thank you for your order!</h2>
    <p style="margin:0 0 16px">Your order <b>${o.id}</b> was received on ${new Date(
    o.createdAt
  ).toLocaleString()}.</p>
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
      ${
        o.promoDiscount
          ? `<div>Discount (${o.promoCode ?? "code"}): <b>-${money(
              o.promoDiscount
            )}</b></div>`
          : ""
      }
      <div>Shipping: <b>${
        o.freeShipping ? "Free" : money(o.shipping)
      }</b></div>
      <div style="margin-top:6px;font-size:16px">Grand Total: <b>${money(
        o.total
      )}</b></div>
    </div>
    <div style="margin:14px 0">
      <div><b>Payment:</b> ${
        o.paymentMethod === "BANK"
          ? "Direct Bank Transfer"
          : "Cash on Delivery"
      }</div>
      ${
        o.bankSlipUrl
          ? `<div>Bank Slip: <a href="${o.bankSlipUrl}">${o.bankSlipUrl}</a></div>`
          : ""
      }
    </div>
    <p style="margin:18px 0 6px"><b>Billing</b><br/>
      ${o.customer.firstName} ${o.customer.lastName}<br/>
      ${o.customer.address}, ${o.customer.city}${
    o.customer.postal ? " " + o.customer.postal : ""
  }<br/>
      ${o.customer.phone ? "Phone: " + o.customer.phone + "<br/>" : ""}Email: ${
    o.customer.email
  }
    </p>
    <p style="margin-top:18px">We’ll notify you once your order is on the way.<br/>— Manny.lk</p>
  </div>`;
}

function renderAdminEmail(o: OrderEmail) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">New order received: ${o.id}</h2>
    <div>Time: ${new Date(o.createdAt).toLocaleString()}</div>
    <div>Payment: ${o.paymentMethod}${
    o.bankSlipUrl ? ` — Slip: ${o.bankSlipUrl}` : ""
  }</div>
    <div>Customer: ${o.customer.firstName} ${o.customer.lastName} — ${
    o.customer.email
  } ${o.customer.phone ? " / " + o.customer.phone : ""}</div>
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
    o.promoDiscount
      ? `| Discount: -${money(o.promoDiscount)} (${o.promoCode ?? "code"})`
      : ""
  } | Shipping: <b>${
    o.freeShipping ? "Free" : money(o.shipping)
  }</b> | Grand: <b>${money(o.total)}</b></div>
    ${
      o.customer.notes
        ? `<div style="margin-top:8px"><b>Notes:</b> ${o.customer.notes}</div>`
        : ""
    }
  </div>`;
}

export async function sendOrderEmails(order: OrderEmail) {
  try {
    const t = getTransporter();

    // customer email
    await t.sendMail({
      from: MAIL_FROM || `Manny.lk <${SMTP_USER}>`,
      to: order.customer.email,
      subject: `Order Confirmation — ${order.id}`,
      html: renderCustomerEmail(order),
    });

    // admin email
    await t.sendMail({
      from: MAIL_FROM || `Manny.lk <${SMTP_USER}>`,
      to: MAIL_TO_ORDERS || SMTP_USER,
      subject: `New Order — ${order.id} — ${order.customer.firstName} ${order.customer.lastName}`,
      html: renderAdminEmail(order),
    });
  } catch (err) {
    console.error("sendOrderEmails failed:", err);
  }
}