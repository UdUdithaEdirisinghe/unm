// src/lib/email.ts
import type { Order } from "./products";

// If SMTP is not configured, silently skip sending.
const hasSMTP =
  !!process.env.SMTP_HOST &&
  !!process.env.SMTP_PORT &&
  !!process.env.SMTP_USER &&
  !!process.env.SMTP_PASS &&
  !!process.env.SMTP_FROM;

export async function sendOrderEmail(order: Order) {
  if (!hasSMTP) return; // no-op in dev

  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM!,
    to: order.customer.email,
    subject: `Manny.lk order ${order.id}`,
    text: `Thanks for your order ${order.id}. Total: ${order.total}`,
  });
}