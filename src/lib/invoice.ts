// src/lib/invoice.ts
/**
* PDF invoice generator for the admin attachment.
* - Uses PDFKit *standalone* build so no AFM files are read from disk
* - If Inter TTF is present we embed it; otherwise bundled fonts still work
* - Never throws for font issues — your email will include a valid PDF
*/

import type { OrderEmail } from "./mail";
import fs from "fs";
import path from "path";

/* ---------- helpers ---------- */

const mm = (v: number) => (v * 72) / 25.4;

const money = (v: number) =>
new Intl.NumberFormat("en-LK", {
style: "currency",
currency: "LKR",
maximumFractionDigits: 0,
}).format(v);

const fmtLK = (iso: string) =>
new Intl.DateTimeFormat("en-LK", {
dateStyle: "medium",
timeStyle: "short",
timeZone: "Asia/Colombo",
}).format(new Date(iso));

/**
* Load PDFKit with fonts embedded (standalone build), fall back to normal build if needed.
* Try to attach fontkit (for TTF embedding) when available.
*/
async function loadPDF(): Promise<{ PDFDocument: any; fontkit: any | null }> {
let mod: any;
// 1) Prefer the standalone build (bundled fonts, no AFM I/O)
try {
// @ts-ignore – runtime import
mod = await import("pdfkit/js/pdfkit.standalone.js");
} catch {
// 2) Fall back to normal build
// @ts-ignore – runtime import
mod = await import("pdfkit");
}
const PDFDocument = mod?.default ?? mod;

// fontkit is optional — only needed if we embed a TTF
let fk: any | null = null;
try {
// @ts-ignore – runtime import
const fkMod = await import("fontkit");
fk = fkMod?.default ?? fkMod;

if (typeof PDFDocument.prototype.registerFontkit !== "function") {
PDFDocument.prototype.registerFontkit = function (kit: any) {
(this as any)._fontkit = kit;
return this;
};
}
} catch {
fk = null;
}

return { PDFDocument, fontkit: fk };
}

function loadInterTTF(): Buffer | null {
const p1 = path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf");
if (fs.existsSync(p1)) return fs.readFileSync(p1);
const p2 = path.join(process.cwd(), "fonts", "Inter-Regular.ttf");
if (fs.existsSync(p2)) return fs.readFileSync(p2);
return null;
}

/* ---------- main ---------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const { PDFDocument, fontkit } = await loadPDF();

const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), bottom: mm(18), left: mm(18), right: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

// Stream → Buffer
const chunks: Buffer[] = [];
const done = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));
});

// Try to embed Inter if available (optional)
try {
const ttf = loadInterTTF();
if (fontkit && ttf) {
doc.registerFontkit(fontkit);
doc.registerFont("Body", ttf);
doc.font("Body");
}
} catch {
// ignore — the standalone build already has fonts so we’re fine
}

try {
/* ---------- Header ---------- */
doc.fillColor("#0f172a").fontSize(18).text(`${brand} — Tax Invoice`, { align: "left" });
doc.moveDown(0.25);
doc.fontSize(10).fillColor("#475569").text(`Order ID: ${order.id}`).text(`Date: ${fmtLK(order.createdAt)}`);

doc.moveDown(0.5);
drawLine(doc);

/* ---------- Billing / Shipping ---------- */
doc.moveDown(0.6);
const startY = doc.y;
const colW =
(doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(4);

doc.fontSize(11).fillColor("#0f172a").text("Billing");
doc
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

doc.fontSize(11).fillColor("#0f172a").text("Shipping", doc.page.margins.left + colW + mm(8), startY);

if (order.customer.shipToDifferent) {
const s = order.customer.shipToDifferent;
doc
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
doc.fontSize(10).fillColor("#334155").text("Same as billing", { width: colW });
}

doc.moveDown(0.6);
drawLine(doc);

/* ---------- Payment ---------- */
doc.moveDown(0.6);
doc.fontSize(11).fillColor("#0f172a").text("Payment");
doc
.fontSize(10)
.fillColor("#334155")
.text(order.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery");
if (order.bankSlipUrl) {
doc.fillColor("#2563eb").text("Bank slip", { link: order.bankSlipUrl, underline: true });
doc.fillColor("#334155");
}

if (order.customer.notes) {
doc.moveDown(0.4);
doc.fontSize(11).fillColor("#0f172a").text("Order notes");
doc.fontSize(10).fillColor("#334155").text(order.customer.notes, {
width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
});
}

doc.moveDown(0.6);
drawLine(doc);

/* ---------- Items ---------- */
doc.moveDown(0.6);
doc.fontSize(11).fillColor("#0f172a").text("Items");

const tableTop = doc.y + mm(2);
const col = {
item: doc.page.margins.left,
qty: doc.page.margins.left + mm(120),
price: doc.page.margins.left + mm(150),
total: doc.page.margins.left + mm(180),
rightEdge: doc.page.width - doc.page.margins.right,
};

doc.fontSize(10).fillColor("#334155");
doc.text("Item", col.item, tableTop, { width: mm(120) });
doc.text("Qty", col.qty, tableTop, { width: mm(20), align: "right" });
doc.text("Price", col.price, tableTop, { width: mm(25), align: "right" });
doc.text("Total", col.total, tableTop, { width: mm(25), align: "right" });

const rowGap = mm(7);
let y = tableTop + mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.rightEdge, y).stroke();

doc.fontSize(10).fillColor("#0f172a");
for (const it of order.items) {
const nextY = y + rowGap;
if (nextY > doc.page.height - doc.page.margins.bottom - mm(40)) {
doc.addPage();
y = doc.y = doc.page.margins.top;
}

doc.text(it.name, col.item, y, { width: mm(120) });
doc.text(String(it.quantity), col.qty, y, { width: mm(20), align: "right" });
doc.text(money(it.price), col.price, y, { width: mm(25), align: "right" });
doc.text(money(it.price * it.quantity), col.total, y, { width: mm(25), align: "right" });

y = nextY;
doc.strokeColor("#f1f5f9").moveTo(col.item, y - mm(2)).lineTo(col.rightEdge, y - mm(2)).stroke();
}

/* ---------- Totals ---------- */
doc.moveDown(1);
const addRow = (label: string, value: string, bold = false) => {
doc
.fontSize(10)
.fillColor("#334155")
.text(label, col.total - mm(45), doc.y, { width: mm(40), align: "right" });
doc
.fontSize(bold ? 12 : 10)
.fillColor("#0f172a")
.text(value, col.total, doc.y, { width: mm(40), align: "right" });
};

addRow("Subtotal", money(order.subtotal));
if (order.promoDiscount && order.promoDiscount > 0) {
addRow(`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`, "-" + money(order.promoDiscount));
}
addRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
addRow("Grand Total", money(order.total), true);

/* ---------- Footer ---------- */
doc.moveDown(1);
drawLine(doc);
doc
.fontSize(9)
.fillColor("#64748b")
.text("Generated automatically by Manny.lk — thank you for your order.", { align: "center" });

doc.end();
} catch (err) {
// As a last resort, create a tiny valid PDF so email never breaks
try {
doc.addPage?.(); // no-op if already has one
doc.fontSize(12).text(`${brand} — Invoice`).moveDown(0.5).text(`Order ID: ${order.id}`).text(`Total: ${money(order.total)}`);
} catch {}
try { doc.end(); } catch {}
}

return done;
}

function drawLine(doc: any) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
doc.strokeColor("#e5e7eb").moveTo(left, doc.y).lineTo(right, doc.y).stroke();
}
