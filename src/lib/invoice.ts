// src/lib/invoice.ts
/**
* PDF invoice generator (attachment for admin email).
* - Embeds a TTF via fontkit *if present* (falls back gracefully).
* - Pulls logo from public/logo/manny-logo.png *if present*.
* - No file I/O outside of fs.readFileSync for bundled assets (no AFM).
* - Always returns a Buffer; if assets are missing we produce a minimal but valid PDF.
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

async function loadPDFStuff(): Promise<{ PDFDocument: any; fontkit: any | null }> {
// @ts-ignore runtime import, types not required
const mod = await import("pdfkit");
const PDFDocument = (mod as any)?.default ?? (mod as any);

let fontkit: any | null = null;
try {
// @ts-ignore runtime import, types not required
const fk = await import("fontkit");
fontkit = (fk as any)?.default ?? (fk as any);
if (typeof (PDFDocument as any).prototype.registerFontkit !== "function") {
(PDFDocument as any).prototype.registerFontkit = function (fkAny: any) {
(this as any)._fontkit = fkAny;
return this;
};
}
} catch {
fontkit = null; // fine, we’ll render without custom font
}

return { PDFDocument, fontkit };
}

function loadInterTTF(): Buffer | null {
const roots = [
path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"),
path.join(process.cwd(), "fonts", "Inter-Regular.ttf"),
];
for (const p of roots) {
if (fs.existsSync(p)) return fs.readFileSync(p);
}
return null;
}

function loadLogo(): Buffer | null {
const roots = [
path.join(process.cwd(), "public", "logo", "manny-logo.png"),
path.join(process.cwd(), "public", "logo.png"),
];
for (const p of roots) {
if (fs.existsSync(p)) return fs.readFileSync(p);
}
return null;
}

function drawRule(doc: any, y?: number) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
const yy = typeof y === "number" ? y : doc.y;
doc.strokeColor("#e5e7eb").moveTo(left, yy).lineTo(right, yy).stroke();
}

/* ---------- main ---------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const { PDFDocument, fontkit } = await loadPDFStuff();

const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), right: mm(18), bottom: mm(18), left: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

const chunks: Buffer[] = [];
const finished = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));
});

/* ---------- fonts (optional) ---------- */
try {
const ttf = fontkit ? loadInterTTF() : null;
if (fontkit && ttf) {
doc.registerFontkit(fontkit);
doc.registerFont("Body", ttf);
doc.font("Body");
}
} catch {
// ignore — we’ll just use built-in font
}

/* ---------- header (logo + company block) ---------- */

const contactEmail = process.env.MAIL_TO_CONTACT || "info@manny.lk";
const wa = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
const displayPhone = wa ? `+${wa}`.replace(/^(\+\d{2})(\d{3})(\d{3})(\d+)/, "$1 $2 $3 $4") : "";
const company = {
name: brand || "Manny.lk",
address: "35/24, Udaperadeniya, Peradeniya",
phone: displayPhone || "+94 76 070 3523",
email: contactEmail,
website: "www.manny.lk",
};

const logo = loadLogo();
const leftX = doc.page.margins.left;
const rightX = doc.page.width - doc.page.margins.right;

let cursorY = doc.y;

if (logo) {
// draw logo at ~28mm width (keeps sharp on A4)
const logoW = mm(28);
doc.image(logo, leftX, cursorY, { width: logoW });
}

// company text to the right of logo (or starting at left if no logo)
const blockX = logo ? leftX + mm(34) : leftX;
const headerTop = cursorY;

doc
.fillColor("#0f172a")
.fontSize(18)
.text(`${company.name}`, blockX, headerTop, { continued: false });

doc.moveDown(0.2);
doc
.fontSize(9)
.fillColor("#64748b")
.text(company.address, blockX)
.text(company.phone, blockX)
.text(company.email, blockX)
.text(company.website, blockX);

// right aligned “Invoice” block
doc
.fontSize(16)
.fillColor("#0f172a")
.text("Invoice", rightX - mm(45), headerTop, { width: mm(45), align: "right" })
.moveDown(0.1)
.fontSize(9)
.fillColor("#475569")
.text(`Order ID: ${order.id}`, rightX - mm(45), doc.y, { width: mm(45), align: "right" })
.text(`Date: ${fmtLK(order.createdAt)}`, rightX - mm(45), doc.y, {
width: mm(45),
align: "right",
});

// move below header
doc.moveTo(leftX, Math.max(doc.y, headerTop + mm(18)));
drawRule(doc, doc.y + mm(4));
doc.moveDown(1);

/* ---------- billing / shipping / payment ---------- */

const usableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const colW = usableW / 2 - mm(4);
const startY = doc.y + mm(2);

// Billing
doc.fontSize(11).fillColor("#0f172a").text("Billing", leftX, startY);
doc
.fontSize(10)
.fillColor("#334155")
.text(
`${order.customer.firstName} ${order.customer.lastName}\n` +
`${order.customer.address}\n` +
`${order.customer.city}${order.customer.postal ? " " + order.customer.postal : ""}\n` +
`${order.customer.phone ? "Phone: " + order.customer.phone + "\n" : ""}` +
`Email: ${order.customer.email}`,
leftX,
doc.y,
{ width: colW }
);

// Shipping + Payment
const rightColX = leftX + colW + mm(8);
doc.fontSize(11).fillColor("#0f172a").text("Shipping", rightColX, startY);
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
rightColX,
doc.y,
{ width: colW }
);
} else {
doc.fontSize(10).fillColor("#334155").text("Same as billing", rightColX, doc.y, { width: colW });
}

doc.moveDown(0.6);
doc.fontSize(11).fillColor("#0f172a").text("Payment", rightColX, doc.y);
doc
.fontSize(10)
.fillColor("#334155")
.text(order.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery", rightColX);
if (order.bankSlipUrl) {
doc.fillColor("#2563eb").text("Bank slip", rightColX, doc.y, { link: order.bankSlipUrl, underline: true });
doc.fillColor("#334155");
}

if (order.customer.notes) {
doc.moveDown(0.6);
doc.fontSize(11).fillColor("#0f172a").text("Order notes", leftX, doc.y);
doc
.fontSize(10)
.fillColor("#334155")
.text(order.customer.notes, leftX, doc.y, { width: usableW });
}

doc.moveDown(0.8);
drawRule(doc, doc.y);
doc.moveDown(0.6);

/* ---------- items table (fits A4 cleanly) ---------- */

doc.fontSize(11).fillColor("#0f172a").text("Items", leftX, doc.y);

const tableTop = doc.y + mm(2);
const xItem = leftX;
const xQty = leftX + mm(120); // ~120mm item column
const xPrice = leftX + mm(150);
const xTotal = leftX + mm(180);
const rightEdge = doc.page.width - doc.page.margins.right;

doc.fontSize(10).fillColor("#334155");
doc.text("Item", xItem, tableTop, { width: mm(120) });
doc.text("Qty", xQty, tableTop, { width: mm(20), align: "right" });
doc.text("Price", xPrice, tableTop, { width: mm(25), align: "right" });
doc.text("Total", xTotal, tableTop, { width: mm(25), align: "right" });

let y = tableTop + mm(6);
doc.strokeColor("#e5e7eb").moveTo(xItem, y).lineTo(rightEdge, y).stroke();

doc.fontSize(10).fillColor("#0f172a");
const rowGap = mm(7);

for (const it of order.items) {
const nextY = y + rowGap;
// page break
if (nextY > doc.page.height - doc.page.margins.bottom - mm(45)) {
doc.addPage();
y = doc.y = doc.page.margins.top;
// re-draw header row after page break (simple version)
doc.fontSize(10).fillColor("#334155");
doc.text("Item", xItem, y, { width: mm(120) });
doc.text("Qty", xQty, y, { width: mm(20), align: "right" });
doc.text("Price", xPrice, y, { width: mm(25), align: "right" });
doc.text("Total", xTotal, y, { width: mm(25), align: "right" });
y += mm(6);
doc.strokeColor("#e5e7eb").moveTo(xItem, y).lineTo(rightEdge, y).stroke();
doc.fontSize(10).fillColor("#0f172a");
}

doc.text(it.name, xItem, y + mm(1), { width: mm(120) });
doc.text(String(it.quantity), xQty, y + mm(1), { width: mm(20), align: "right" });
doc.text(money(it.price), xPrice, y + mm(1), { width: mm(25), align: "right" });
doc.text(money(it.price * it.quantity), xTotal, y + mm(1), { width: mm(25), align: "right" });

y = nextY;
doc.strokeColor("#f1f5f9").moveTo(xItem, y - mm(1)).lineTo(rightEdge, y - mm(1)).stroke();
}

/* ---------- totals block ---------- */

doc.moveDown(1);

const addRow = (label: string, value: string, bold = false) => {
doc
.fontSize(10)
.fillColor("#334155")
.text(label, xTotal - mm(45), doc.y, { width: mm(40), align: "right" });
doc
.fontSize(bold ? 12 : 10)
.fillColor("#0f172a")
.text(value, xTotal, doc.y, { width: mm(40), align: "right" });
};

addRow("Subtotal", money(order.subtotal));
if (order.promoDiscount && order.promoDiscount > 0) {
addRow(`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`, "-" + money(order.promoDiscount));
}
addRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
addRow("Grand Total", money(order.total), true);

/* ---------- footer (centered) ---------- */

doc.moveDown(1);
drawRule(doc, doc.y);
doc.moveDown(0.6);
doc
.fontSize(9)
.fillColor("#64748b")
.text(`© ${new Date().getFullYear()} ${company.name} — All rights reserved.`, leftX, doc.y, {
width: usableW,
align: "center",
});

doc.end();
return finished;
}
