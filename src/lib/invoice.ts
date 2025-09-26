// src/lib/invoice.ts
/**
* Minimal PDF invoice generator for the admin attachment.
* - No file I/O, no custom fonts (avoids ENOENT)
* - Works with both CJS and ESM builds of pdfkit
* - Returns Buffer for nodemailer attachment
*/

import type { OrderEmail } from "./mail";

/** Lazy-load pdfkit in an ESM/CJS-safe way */
async function loadPDFKit(): Promise<any> {
const mod: any = await import("pdfkit");
return mod?.default ?? mod;
}

/** mm → points helper (A4 is ~595.28 × 841.89 pt) */
const mm = (v: number) => (v * 72) / 25.4;

/** Currency (LKR, 0 decimals) */
const money = (v: number) =>
new Intl.NumberFormat("en-LK", {
style: "currency",
currency: "LKR",
maximumFractionDigits: 0,
}).format(v);

/**
* Create invoice PDF as Buffer (server-side only).
* No site layout/colors are changed; this only affects the email attachment.
*/
export async function createInvoicePdf(
order: OrderEmail,
brand: string
): Promise<Buffer> {
const PDFDocument = await loadPDFKit(); // robust against ESM/CJS
const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), bottom: mm(18), left: mm(18), right: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

// 🔒 Force built-in core fonts (no .afm/.ttf lookups)
const FONT = {
REG: "Times-Roman",
BOLD: "Times-Bold",
};

const chunks: Buffer[] = [];
return await new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));

// ===== Header =====
doc.font(FONT.BOLD).fillColor("#0f172a").fontSize(18).text(`${brand} — Tax Invoice`, { align: "left" });
doc.moveDown(0.25);
doc
.font(FONT.REG)
.fontSize(10)
.fillColor("#475569")
.text(`Order ID: ${order.id}`)
.text(
`Date: ${new Intl.DateTimeFormat("en-LK", {
dateStyle: "medium",
timeStyle: "short",
timeZone: "Asia/Colombo",
}).format(new Date(order.createdAt))}`
);

doc.moveDown(0.5);
drawLine(doc);

// ===== Addresses / Payment =====
doc.moveDown(0.6);
const startY = doc.y;
const colW =
(doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(4);

// Billing
doc.font(FONT.BOLD).fontSize(11).fillColor("#0f172a").text("Billing", { continued: false });
doc
.font(FONT.REG)
.fontSize(10)
.fillColor("#334155")
.text(
`${order.customer.firstName} ${order.customer.lastName}\n` +
`${order.customer.address}\n` +
`${order.customer.city}${order.customer.postal ? " " + order.customer.postal : ""}\n` +
`${order.customer.phone ? "Phone: " + order.customer.phone + "\n" : ""}` +
`Email: ${order.customer.email}`,
{ width: colW }
);

// Shipping (if different)
doc
.font(FONT.BOLD)
.fontSize(11)
.fillColor("#0f172a")
.text("Shipping", doc.page.margins.left + colW + mm(8), startY, {
continued: false,
});

if (order.customer.shipToDifferent) {
const s = order.customer.shipToDifferent;
doc
.font(FONT.REG)
.fontSize(10)
.fillColor("#334155")
.text(
`${s.name || `${order.customer.firstName} ${order.customer.lastName}`}\n` +
`${s.address}\n` +
`${s.city}${s.postal ? " " + s.postal : ""}\n` +
`${s.phone ? "Phone: " + s.phone : ""}`,
{ width: colW }
);
} else {
doc.font(FONT.REG).fontSize(10).fillColor("#334155").text("Same as billing", { width: colW });
}

doc.moveDown(0.6);
drawLine(doc);

// ===== Payment summary =====
doc.moveDown(0.6);
doc.font(FONT.BOLD).fontSize(11).fillColor("#0f172a").text("Payment");
doc
.font(FONT.REG)
.fontSize(10)
.fillColor("#334155")
.text(order.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery");
if (order.bankSlipUrl) {
doc.fillColor("#2563eb").text("Bank slip", { link: order.bankSlipUrl, underline: true });
doc.fillColor("#334155");
}

if (order.customer.notes) {
doc.moveDown(0.4);
doc.font(FONT.BOLD).fontSize(11).fillColor("#0f172a").text("Order notes");
doc.font(FONT.REG).fontSize(10).fillColor("#334155").text(order.customer.notes, {
width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
});
}

doc.moveDown(0.6);
drawLine(doc);

// ===== Items table =====
doc.moveDown(0.6);
doc.font(FONT.BOLD).fontSize(11).fillColor("#0f172a").text("Items");

const tableTop = doc.y + mm(2);
const col = {
item: doc.page.margins.left,
qty: doc.page.margins.left + mm(120),
price: doc.page.margins.left + mm(150),
total: doc.page.margins.left + mm(180),
rightEdge: doc.page.width - doc.page.margins.right,
};

// Header row
doc.font(FONT.REG).fontSize(10).fillColor("#334155");
doc.text("Item", col.item, tableTop, { width: mm(120) });
doc.text("Qty", col.qty, tableTop, { width: mm(20), align: "right" });
doc.text("Price", col.price, tableTop, { width: mm(25), align: "right" });
doc.text("Total", col.total, tableTop, { width: mm(25), align: "right" });

const rowGap = mm(7);
let y = tableTop + mm(6);

doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.rightEdge, y).stroke();

doc.font(FONT.REG).fontSize(10).fillColor("#0f172a");
for (const it of order.items) {
const lineHeight = rowGap;
const nextY = y + lineHeight;

// Page break if needed
if (nextY > doc.page.height - doc.page.margins.bottom - mm(40)) {
doc.addPage();
y = doc.y = doc.page.margins.top;

// re-draw table header on new page
doc.font(FONT.REG).fontSize(10).fillColor("#334155");
doc.text("Item", col.item, y, { width: mm(120) });
doc.text("Qty", col.qty, y, { width: mm(20), align: "right" });
doc.text("Price", col.price, y, { width: mm(25), align: "right" });
doc.text("Total", col.total, y, { width: mm(25), align: "right" });
y += mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.rightEdge, y).stroke();
doc.font(FONT.REG).fillColor("#0f172a");
}

doc.text(it.name, col.item, y, { width: mm(120) });
doc.text(String(it.quantity), col.qty, y, { width: mm(20), align: "right" });
doc.text(money(it.price), col.price, y, { width: mm(25), align: "right" });
doc.text(money(it.price * it.quantity), col.total, y, { width: mm(25), align: "right" });

y = nextY;
doc
.strokeColor("#f1f5f9")
.moveTo(col.item, y - mm(2))
.lineTo(col.rightEdge, y - mm(2))
.stroke();
}

// ===== Totals =====
doc.moveDown(1);
const totalsX = col.total;
const totalsW = mm(40);

const addRow = (label: string, value: string, bold = false) => {
doc
.font(FONT.REG)
.fontSize(10)
.fillColor("#334155")
.text(label, totalsX - mm(45), doc.y, { width: mm(40), align: "right" });
doc
.font(bold ? FONT.BOLD : FONT.REG)
.fontSize(bold ? 12 : 10)
.fillColor("#0f172a")
.text(value, totalsX, doc.y, { width: totalsW, align: "right" });
};

addRow("Subtotal", money(order.subtotal));
if (order.promoDiscount && order.promoDiscount > 0) {
addRow(
`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`,
"-" + money(order.promoDiscount)
);
}
addRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
addRow("Grand Total", money(order.total), true);

// ===== Footer =====
doc.moveDown(1);
drawLine(doc);
doc
.font(FONT.REG)
.fontSize(9)
.fillColor("#64748b")
.text("Generated automatically by Manny.lk — thank you for your order.", {
align: "center",
});

doc.end();
});
}

function drawLine(doc: any) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
doc.strokeColor("#e5e7eb").moveTo(left, doc.y).lineTo(right, doc.y).stroke();
}
