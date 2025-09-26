// src/lib/invoice.ts
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { formatCurrency } from "./format";

export type InvoiceItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceData = {
  orderId: string;
  createdAt: string; // ISO
  items: InvoiceItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: "COD" | "BANK";
  promoCode?: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    postal?: string;
  };
  shipDifferent?: boolean;
  shippingAddress?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address: string;
    city: string;
    postal?: string;
  };
};

/** Generate a PDF invoice as a Buffer (server-side only). */
export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48 });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));     // <-- typed
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  );

  // Optional logo
  try {
    const logoPath = path.join(process.cwd(), "public", "logo", "manny-logo.png");
    if (fs.existsSync(logoPath)) doc.image(logoPath, 48, 36, { width: 120 });
  } catch {
    /* ignore logo errors */
  }

  // Header
  doc
    .fontSize(20)
    .text("INVOICE", { align: "right" })
    .moveDown(0.5)
    .fontSize(10)
    .text(
      `Order ID: ${data.orderId}`,
      { align: "right" }
    )
    .text(
      `Date: ${new Date(data.createdAt).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}`,
      { align: "right" }
    )
    .moveDown(1.2);

  // Bill To
  const bill = data.customer;
  doc
    .fontSize(12)
    .text("Bill To", { underline: true })
    .moveDown(0.5)
    .fontSize(10)
    .text(`${bill.firstName} ${bill.lastName}`)
    .text(bill.address)
    .text(`${bill.city}${bill.postal ? " " + bill.postal : ""}`)
    .text(`Phone: ${bill.phone ?? "-"}`)
    .text(`Email: ${bill.email}`);

  // Ship To (if any)
  if (data.shipDifferent && data.shippingAddress) {
    const s = data.shippingAddress;
    const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(" ");
    doc
      .moveUp(5.1)
      .text(" ", 300)
      .fontSize(12)
      .text("Ship To", 300, doc.y, { underline: true })
      .moveDown(0.5)
      .fontSize(10)
      .text(name || "-", 300)
      .text(s.address, 300)
      .text(`${s.city}${s.postal ? " " + s.postal : ""}`, 300)
      .text(`Phone: ${s.phone || "-"}`, 300);
  }

  doc.moveDown(1.2);

  // Table header
  const yStart = doc.y;
  doc
    .fontSize(11)
    .text("Item", 48, yStart)
    .text("Qty", 300, yStart, { width: 40, align: "right" })
    .text("Unit", 350, yStart, { width: 80, align: "right" })
    .text("Total", 440, yStart, { width: 100, align: "right" });
  doc.moveTo(48, doc.y + 4).lineTo(545, doc.y + 4).stroke();

  // Rows
  doc.moveDown(0.5).fontSize(10);
  data.items.forEach((it) => {
    const y = doc.y;
    doc
      .text(it.name, 48, y, { width: 240 })
      .text(String(it.quantity), 300, y, { width: 40, align: "right" })
      .text(formatCurrency(it.unitPrice), 350, y, { width: 80, align: "right" })
      .text(formatCurrency(it.total), 440, y, { width: 100, align: "right" })
      .moveDown(0.2);
  });

  doc.moveDown(1);
  doc.moveTo(350, doc.y).lineTo(545, doc.y).stroke();

  // Totals
  const line = (label: string, value: string, bold = false) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .text(label, 350, doc.y, { width: 120, align: "right" })
      .text(value, 470, doc.y, { width: 70, align: "right" })
      .font("Helvetica");
  };

  doc.moveDown(0.4);
  line("Subtotal", formatCurrency(data.subtotal));
  if (data.discount > 0) line("Discount", "-" + formatCurrency(data.discount));
  line("Shipping", data.shipping === 0 ? "Free" : formatCurrency(data.shipping));
  doc.moveDown(0.2);
  doc.moveTo(350, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.2);
  line("Total", formatCurrency(data.total), true);

  doc.moveDown(1);
  doc.fontSize(10).text(`Payment Method: ${data.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}`);
  if (data.promoCode) doc.text(`Promo Code: ${data.promoCode}`);

  doc.moveDown(1);
  doc.fontSize(9).fillColor("#555").text("Thank you for your order!", { align: "center" });

  doc.end();
  return done;
}