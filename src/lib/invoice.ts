// src/lib/invoice.ts
/**
* PDF invoice generator (server-friendly).
* - Uses pdfkit's standalone build (no AFM file I/O -> no ENOENT).
* - Optionally embeds Inter-Regular.ttf if available via fontkit.
* - Optionally draws /public/logo/manny-logo.png if available.
* - Always returns a Buffer (so the email attachment is reliable).
*/

import type { OrderEmail } from "./mail";
import fs from "fs";
import path from "path";

/* ----------------------------- helpers ----------------------------- */

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

/** Import pdfkit (standalone) + fontkit safely */
async function loadPDFStuff(): Promise<{ PDFDocument: any; fontkit: any | null }> {
// ⬇️ Standalone build has bundled standard fonts; no AFM reads on disk.
// @ts-ignore
const mod = await import("pdfkit/js/pdfkit.standalone.js");
const PDFDocument = (mod as any)?.default ?? (mod as any);

let fontkit: any | null = null;
try {
// @ts-ignore
const fk = await import("fontkit");
fontkit = (fk as any)?.default ?? (fk as any);

// Ensure registerFontkit exists even if not provided
if (typeof (PDFDocument as any).prototype.registerFontkit !== "function") {
(PDFDocument as any).prototype.registerFontkit = function (fkAny: any) {
(this as any)._fontkit = fkAny;
return this;
};
}
} catch {
fontkit = null;
}
return { PDFDocument, fontkit };
}

function readIfExists(p: string): Buffer | null {
try {
return fs.existsSync(p) ? fs.readFileSync(p) : null;
} catch {
return null;
}
}

function drawRule(doc: any) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
doc
.strokeColor("#e5e7eb")
.moveTo(left, doc.y)
.lineTo(right, doc.y)
.stroke();
}

/* -------------------------- company details ------------------------- */
/** You can override via env; sensible fallbacks included */
function getCompany(brand: string) {
const address =
process.env.COMPANY_ADDRESS || "35/24, Udaperadeniya, Peradeniya";
const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "94760703523";
const phonePretty = phone.replace(/^94/, "+94 ").replace(/(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3");
const email = process.env.MAIL_TO_CONTACT || "info@manny.lk";
const website = process.env.NEXT_PUBLIC_SITE_URL || "https://www.manny.lk";
return { brand, address, phone: phonePretty, email, website };
}

/* ---------------------------- main export --------------------------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const { PDFDocument, fontkit } = await loadPDFStuff();
const company = getCompany(brand);

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

/* ---------- fonts (optional) ---------- */
try {
const ttf = readIfExists(path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"));
if (fontkit && ttf) {
doc.registerFontkit(fontkit);
doc.registerFont("Body", ttf);
doc.font("Body");
}
} catch {
// fine; built-in fonts from standalone build will be used
}

/* ---------- header with logo + brand ---------- */
const logoPng = readIfExists(path.join(process.cwd(), "public", "logo", "manny-logo.png"));
const headerY = doc.y;

if (logoPng) {
// logo on left
doc.image(logoPng, doc.page.margins.left, headerY, { width: mm(24) });
doc
.fillColor("#0f172a")
.fontSize(18)
.text(`${company.brand}`, doc.page.margins.left + mm(30), headerY + mm(2), {
width: mm(120),
});
doc
.fontSize(11)
.fillColor("#334155")
.text("Invoice", doc.page.margins.left + mm(30), headerY + mm(11));
} else {
// text-only fallback
doc.fillColor("#0f172a").fontSize(18).text(`${company.brand}`, { continued: false });
doc.fontSize(11).fillColor("#334155").text("Invoice");
}

// company contact block (right side)
const rightX = doc.page.width - doc.page.margins.right - mm(70);
const blkTop = headerY;
doc
.fontSize(9)
.fillColor("#334155")
.text(company.address, rightX, blkTop, { width: mm(70), align: "right" })
.text(company.phone ? `Phone: ${company.phone}` : "", rightX, doc.y, { width: mm(70), align: "right" })
.text(company.email, rightX, doc.y, { width: mm(70), align: "right" })
.text(company.website, rightX, doc.y, { width: mm(70), align: "right" });

doc.moveDown(0.8);
drawRule(doc);

/* ---------- order meta (two columns) ---------- */
doc.moveDown(0.6);
const metaY = doc.y;
const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(6);

// left: order id + date
doc
.fontSize(10)
.fillColor("#475569")
.text(`Order ID: ${order.id}`, doc.page.margins.left, metaY, { width: colW })
.text(`Date: ${fmtLK(order.createdAt)}`, doc.page.margins.left, doc.y, { width: colW });

// right: payment method
doc
.fontSize(10)
.fillColor("#475569")
.text(
`Payment: ${order.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}`,
doc.page.margins.left + colW + mm(12),
metaY,
{ width: colW }
);

doc.moveDown(0.6);
drawRule(doc);

/* ---------- addresses ---------- */
doc.moveDown(0.6);
const addrTop = doc.y;

doc.fontSize(11).fillColor("#0f172a").text("Billing", doc.page.margins.left, addrTop);
doc
.fontSize(10)
.fillColor("#334155")
.text(
`${order.customer.firstName} ${order.customer.lastName}\n` +
`${order.customer.address}, ${order.customer.city}${
order.customer.postal ? " " + order.customer.postal : ""
}\n` +
`${order.customer.phone ? "Phone: " + order.customer.phone + "\n" : ""}` +
`Email: ${order.customer.email}`,
doc.page.margins.left,
doc.y,
{ width: colW }
);

doc.fontSize(11).fillColor("#0f172a").text("Shipping", doc.page.margins.left + colW + mm(12), addrTop);
if (order.customer.shipToDifferent) {
const s = order.customer.shipToDifferent;
doc
.fontSize(10)
.fillColor("#334155")
.text(
`${s.name || `${order.customer.firstName} ${order.customer.lastName}`}\n` +
`${s.address}, ${s.city}${s.postal ? " " + s.postal : ""}\n` +
`${s.phone ? "Phone: " + s.phone : ""}`,
doc.page.margins.left + colW + mm(12),
doc.y,
{ width: colW }
);
} else {
doc
.fontSize(10)
.fillColor("#334155")
.text("Same as billing", doc.page.margins.left + colW + mm(12), doc.y, { width: colW });
}

doc.moveDown(0.6);
drawRule(doc);

/* ---------- items table ---------- */
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

// header row
doc.fontSize(10).fillColor("#64748b");
doc.text("Item", col.item, tableTop, { width: mm(120) });
doc.text("Qty", col.qty, tableTop, { width: mm(20), align: "right" });
doc.text("Price", col.price, tableTop, { width: mm(25), align: "right" });
doc.text("Total", col.total, tableTop, { width: mm(25), align: "right" });

let y = tableTop + mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.rightEdge, y).stroke();

doc.fontSize(10).fillColor("#0f172a");
const rowGap = mm(7);

for (const it of order.items) {
const nextY = y + rowGap;
if (nextY > doc.page.height - doc.page.margins.bottom - mm(50)) {
// new page
doc.addPage();
y = doc.y = doc.page.margins.top;
// repeat table header on new page
doc.fontSize(10).fillColor("#64748b");
doc.text("Item", col.item, y, { width: mm(120) });
doc.text("Qty", col.qty, y, { width: mm(20), align: "right" });
doc.text("Price", col.price, y, { width: mm(25), align: "right" });
doc.text("Total", col.total, y, { width: mm(25), align: "right" });
y += mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.rightEdge, y).stroke();
doc.fontSize(10).fillColor("#0f172a");
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

/* ---------- totals (right aligned) ---------- */
doc.moveDown(1);

const labelX = col.total - mm(50);
const valueX = col.total;
const valueW = mm(40);

const addRow = (label: string, value: string, bold = false) => {
const y0 = doc.y;
doc.fontSize(10).fillColor("#334155").text(label, labelX, y0, { width: mm(45), align: "right" });
doc
.fontSize(bold ? 12 : 10)
.fillColor("#0f172a")
.text(value, valueX, y0, { width: valueW, align: "right" });
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

/* ---------- notes (optional) ---------- */
if (order.customer.notes) {
doc.moveDown(0.8);
drawRule(doc);
doc.moveDown(0.4);
doc.fontSize(11).fillColor("#0f172a").text("Notes");
doc.fontSize(10).fillColor("#334155").text(order.customer.notes, {
width: col.rightEdge - doc.page.margins.left,
});
}

/* ---------- footer (centered) ---------- */
doc.moveDown(1);
drawRule(doc);

const footerText = `© ${new Date().getFullYear()} ${company.brand} — All rights reserved.`;
doc
.fontSize(9)
.fillColor("#64748b")
.text(footerText, doc.page.margins.left, doc.y + mm(2), {
width: col.rightEdge - doc.page.margins.left,
align: "center",
});

doc.end();
return done;
}
