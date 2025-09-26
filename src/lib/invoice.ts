// src/lib/invoice.ts
/**
* PDF invoice generator for the admin attachment.
* - Embeds a TTF font (no AFM lookups -> no ENOENT)
* - Dynamically loads pdfkit + fontkit with local TS ignores (no global .d.ts needed)
* - If the TTF is missing, falls back to a minimal PDF (still valid) so email send never breaks
*/

import type { OrderEmail } from "./mail";
import fs from "fs";
import path from "path";

// mm → pt
const mm = (v: number) => (v * 72) / 25.4;

// Currency (LKR, 0 decimals)
const money = (v: number) =>
new Intl.NumberFormat("en-LK", {
style: "currency",
currency: "LKR",
maximumFractionDigits: 0,
}).format(v);

// Date in LK timezone
const fmtLK = (iso: string) =>
new Intl.DateTimeFormat("en-LK", {
dateStyle: "medium",
timeStyle: "short",
timeZone: "Asia/Colombo",
}).format(new Date(iso));

/** Load pdfkit + fontkit in a way that won't upset TypeScript or the bundler */
async function loadPDFStuff(): Promise<{ PDFDocument: any; haveFontkit: boolean }> {
// @ts-ignore - pdfkit has no ESM types in many setups; we use runtime-only
const mod = await import("pdfkit");
const PDFDocument = (mod as any)?.default ?? (mod as any);

let haveFontkit = false;
try {
// @ts-ignore - we intentionally avoid typings; runtime only
const fkMod = await import("fontkit");
const fontkit = (fkMod as any)?.default ?? (fkMod as any);

// Some builds expose registerFontkit; in others we attach _fontkit
if (typeof (PDFDocument as any).prototype.registerFontkit === "function") {
(PDFDocument as any).prototype.registerFontkit(fontkit);
} else {
(PDFDocument as any).prototype.registerFontkit = function (fk: any) {
(this as any)._fontkit = fk;
return this;
};
(PDFDocument as any).prototype.registerFontkit(fontkit);
}
haveFontkit = true;
} catch {
// No fontkit present at runtime; we'll handle this gracefully below.
haveFontkit = false;
}

return { PDFDocument, haveFontkit };
}

/**
* Try to load a TTF you ship with the app (recommended location):
* public/fonts/Inter-Regular.ttf
* You can replace with any other TTF you prefer.
*/
function loadBundledTTF(): Buffer | null {
// Primary: Inter-Regular.ttf in public/fonts
const p1 = path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf");
if (fs.existsSync(p1)) return fs.readFileSync(p1);

// Secondary: Inter.ttf at project root /fonts (in case you put it there)
const p2 = path.join(process.cwd(), "fonts", "Inter-Regular.ttf");
if (fs.existsSync(p2)) return fs.readFileSync(p2);

return null;
}

/**
* Create invoice PDF as Buffer.
* NOTE: We *never* throw for font issues. If we cannot load fontkit+TTF,
* we still return a valid 1-page PDF (minimal text) so email always goes out.
*/
export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const { PDFDocument, haveFontkit } = await loadPDFStuff();

// If fontkit is available, we embed a TTF and render the full invoice.
// If not, we return a minimal PDF fallback to avoid breaking the email.
const ttf = haveFontkit ? loadBundledTTF() : null;

const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), bottom: mm(18), left: mm(18), right: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

const chunks: Buffer[] = [];
const finished = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));
});

// ===== Path A: Full invoice (fontkit + TTF available) =====
if (haveFontkit && ttf) {
try {
doc.registerFont("Body", ttf);
doc.font("Body");

// Header
doc.fillColor("#0f172a").fontSize(18).text(`${brand} — Tax Invoice`, { align: "left" });
doc.moveDown(0.25);
doc
.fontSize(10)
.fillColor("#475569")
.text(`Order ID: ${order.id}`)
.text(`Date: ${fmtLK(order.createdAt)}`);

doc.moveDown(0.5);
drawLine(doc);

// Billing / Shipping
doc.moveDown(0.6);
const startY = doc.y;
const colW =
(doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(4);

doc.fontSize(11).fillColor("#0f172a").text("Billing", { continued: false });
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

doc
.fontSize(11)
.fillColor("#0f172a")
.text("Shipping", doc.page.margins.left + colW + mm(8), startY);

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

// Payment
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

// Items table
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

// Totals
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

// Footer
doc.moveDown(1);
drawLine(doc);
doc
.fontSize(9)
.fillColor("#64748b")
.text("Generated automatically by Manny.lk — thank you for your order.", { align: "center" });

doc.end();
return finished;
} catch (err) {
// fall through to minimal fallback
}
}

// ===== Path B: Minimal fallback (no fontkit / no TTF) =====
// We avoid any font switching that would trigger AFM lookups.
try {
doc
.fontSize(12)
.text(`${brand} — Invoice`, { align: "left" })
.moveDown(0.5)
.fontSize(10)
.text(`Order ID: ${order.id}`)
.text(`Date: ${fmtLK(order.createdAt)}`)
.moveDown(0.5)
.text(`Total: ${money(order.total)}`);

doc.end();
} catch {
// Last resort: ensure stream closes
try { doc.end(); } catch {}
}

return finished;
}

function drawLine(doc: any) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
doc.strokeColor("#e5e7eb").moveTo(left, doc.y).lineTo(right, doc.y).stroke();
}
