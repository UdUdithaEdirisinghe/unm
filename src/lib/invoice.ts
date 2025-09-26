// src/lib/invoice.ts
/**
* PDF invoice generator for the admin attachment.
* - Uses PDFKit *standalone* build → no AFM reads (no ENOENT)
* - Optional logo at the top (PNG/JPG if present under /public/logo*)
* - Clean alignment for table & totals
* - Subtle copy update + footer: "© Manny.lk — All rights reserved."
*/

import type { OrderEmail } from "./mail";
import fs from "fs";
import path from "path";

/* ---------------- helpers ---------------- */

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

async function loadPDF(): Promise<{ PDFDocument: any; fontkit: any | null }> {
let mod: any;
try {
// @ts-ignore runtime import
mod = await import("pdfkit/js/pdfkit.standalone.js");
} catch {
// @ts-ignore runtime import
mod = await import("pdfkit");
}
const PDFDocument = mod?.default ?? mod;

let fk: any | null = null;
try {
// @ts-ignore runtime import
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

/** Try to load a brand TTF (optional). */
function loadInterTTF(): Buffer | null {
const p1 = path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf");
if (fs.existsSync(p1)) return fs.readFileSync(p1);
const p2 = path.join(process.cwd(), "fonts", "Inter-Regular.ttf");
if (fs.existsSync(p2)) return fs.readFileSync(p2);
return null;
}

/** Try common logo file locations (PNG/JPG only). */
function loadLogo(): Buffer | null {
const roots = [
path.join(process.cwd(), "public", "logo.png"),
path.join(process.cwd(), "public", "logo.jpg"),
path.join(process.cwd(), "public", "logo", "logo.png"),
path.join(process.cwd(), "public", "logo", "logo.jpg"),
];
for (const p of roots) {
if (fs.existsSync(p)) return fs.readFileSync(p);
}
return null;
}

/* ---------------- main ---------------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const { PDFDocument, fontkit } = await loadPDF();

const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), bottom: mm(18), left: mm(18), right: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

const chunks: Buffer[] = [];
const done = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));
});

// Optional brand font
try {
const ttf = loadInterTTF();
if (fontkit && ttf) {
doc.registerFontkit(fontkit);
doc.registerFont("Body", ttf);
doc.font("Body");
}
} catch {
/* ignore, bundled fonts still work */
}

// Palette (keeps your email/site vibe)
const ink = "#0f172a"; // title / headings
const text = "#334155"; // body
const sub = "#475569"; // meta
const line = "#e5e7eb"; // rules
const light = "#f8fafc"; // table header bg
const link = "#2563eb"; // links if any

try {
/* ---------- Header row with logo ---------- */
const topY = doc.y;
const logo = loadLogo();
const headerH = mm(18);

if (logo) {
// left: logo
doc.image(logo, doc.page.margins.left, topY, { width: mm(28), height: headerH, align: "left" });
}

// right: brand + title
const titleX = doc.page.margins.left + (logo ? mm(34) : 0);
doc
.fillColor(ink)
.fontSize(18)
.text(`${brand} — Tax Invoice`, titleX, topY, { continued: false });

doc.moveDown(0.15);
doc.fontSize(10).fillColor(sub).text(`Order ID: ${order.id}`);
doc.fillColor(sub).text(`Date: ${fmtLK(order.createdAt)}`);

doc.moveDown(0.4);
drawLine(doc, line);

/* ---------- Billing / Shipping / Payment blocks ---------- */
doc.moveDown(0.6);
const startY = doc.y;
const colW =
(doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(6);

// Billing
doc.fontSize(11).fillColor(ink).text("Billing", { continued: false });
doc
.fontSize(10)
.fillColor(text)
.text(
`${order.customer.firstName} ${order.customer.lastName}\n` +
`${order.customer.address}\n` +
`${order.customer.city}${order.customer.postal ? " " + order.customer.postal : ""}\n` +
`${order.customer.phone ? "Phone: " + order.customer.phone + "\n" : ""}` +
`Email: ${order.customer.email}`,
{ width: colW }
);

// Shipping (same row)
doc.fontSize(11).fillColor(ink).text("Shipping", doc.page.margins.left + colW + mm(12), startY);
if (order.customer.shipToDifferent) {
const s = order.customer.shipToDifferent;
doc
.fontSize(10)
.fillColor(text)
.text(
`${s.name || `${order.customer.firstName} ${order.customer.lastName}`}\n` +
`${s.address}\n` +
`${s.city}${s.postal ? " " + s.postal : ""}\n` +
`${s.phone ? "Phone: " + s.phone : ""}`,
{ width: colW }
);
} else {
doc.fontSize(10).fillColor(text).text("Same as billing", { width: colW });
}

// Payment (new short block below)
doc.moveDown(0.4);
doc.fontSize(11).fillColor(ink).text("Payment");
doc
.fontSize(10)
.fillColor(text)
.text(order.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery");
if (order.bankSlipUrl) {
doc.fillColor(link).text("Bank slip", { link: order.bankSlipUrl, underline: true });
doc.fillColor(text);
}

if (order.customer.notes) {
doc.moveDown(0.35);
doc.fontSize(11).fillColor(ink).text("Order notes");
doc.fontSize(10).fillColor(text).text(order.customer.notes, {
width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
});
}

doc.moveDown(0.6);
drawLine(doc, line);

/* ---------- Items table ---------- */
doc.moveDown(0.6);
doc.fontSize(11).fillColor(ink).text("Items");

const tableTop = doc.y + mm(2);
// Column plan: item (flex), qty (fixed), price (fixed), total (fixed)
const xItem = doc.page.margins.left;
const xQty = doc.page.width - doc.page.margins.right - mm(60);
const xPrice = doc.page.width - doc.page.margins.right - mm(35);
const xTotal = doc.page.width - doc.page.margins.right - mm(5);
const itemWidth = xQty - xItem - mm(4);

// Header
doc.rect(xItem, tableTop - mm(5), doc.page.width - doc.page.margins.left - doc.page.margins.right, mm(8))
.fillOpacity(1)
.fill(light)
.fillOpacity(1);
doc
.fontSize(10)
.fillColor(ink)
.text("Item", xItem + mm(2), tableTop - mm(4), { width: itemWidth });
doc.text("Qty", xQty, tableTop - mm(4), { width: mm(20), align: "right" });
doc.text("Price", xPrice, tableTop - mm(4), { width: mm(30), align: "right" });
doc.text("Total", xTotal, tableTop - mm(4), { width: mm(30), align: "right" });

let y = tableTop + mm(6);
doc.strokeColor(line).moveTo(xItem, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();

// Rows
doc.fontSize(10).fillColor(ink);
const rowGap = mm(7.5);

for (const it of order.items) {
const nextY = y + rowGap;
if (nextY > doc.page.height - doc.page.margins.bottom - mm(42)) {
doc.addPage();
y = doc.y = doc.page.margins.top;
}

doc.text(it.name, xItem, y - mm(4.5), { width: itemWidth });
doc.text(String(it.quantity), xQty, y - mm(4.5), { width: mm(20), align: "right" });
doc.text(money(it.price), xPrice, y - mm(4.5), { width: mm(30), align: "right" });
doc.text(money(it.price * it.quantity), xTotal, y - mm(4.5), { width: mm(30), align: "right" });

y = nextY;
doc.strokeColor("#f1f5f9").moveTo(xItem, y - mm(2)).lineTo(doc.page.width - doc.page.margins.right, y - mm(2)).stroke();
}

/* ---------- Totals (right aligned) ---------- */
doc.moveDown(1);
const totalsLabelX = xPrice - mm(5);
const totalsValueX = xTotal;

const addRow = (label: string, value: string, bold = false) => {
doc.fontSize(10).fillColor(sub).text(label, totalsLabelX - mm(35), doc.y, {
width: mm(35),
align: "right",
});
doc.fontSize(bold ? 12 : 10).fillColor(ink).text(value, totalsValueX - mm(30), doc.y, {
width: mm(30),
align: "right",
});
};

addRow("Subtotal", money(order.subtotal));
if (order.promoDiscount && order.promoDiscount > 0) {
addRow(`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`, "-" + money(order.promoDiscount));
}
addRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
addRow("Grand Total", money(order.total), true);

/* ---------- Footer ---------- */
doc.moveDown(1);
drawLine(doc, line);
doc
.fontSize(9)
.fillColor("#64748b")
.text(`© ${new Date().getFullYear()} ${brand} — All rights reserved.`, {
align: "center",
});

doc.end();
} catch {
// Ultra-minimal fallback so mail always includes a valid PDF
try {
doc.fontSize(12).text(`${brand} — Tax Invoice`).moveDown(0.4);
doc.fontSize(10).text(`Order ID: ${order.id}`).text(`Date: ${fmtLK(order.createdAt)}`).moveDown(0.4);
doc.text(`Total: ${money(order.total)}`);
doc.end();
} catch {}
}

return done;
}

/* ---------------- utils ---------------- */

function drawLine(doc: any, color: string) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
doc.strokeColor(color).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
}
