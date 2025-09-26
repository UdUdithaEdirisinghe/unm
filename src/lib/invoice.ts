// src/lib/invoice.ts
/**
* Invoice PDF generator (server-side).
* FIXES: "no such file or directory ... helvetica.afm" by embedding Inter TTF
* before any text is written (no built-in fonts are used).
* Works with pdfkit ^0.17 and fontkit ^2.
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

function findFirstExisting(paths: string[]): string | null {
for (const p of paths) if (p && fs.existsSync(p)) return p;
return null;
}

/* ---------- robust loaders (ESM/CJS safe) ---------- */

async function loadPDFKit(): Promise<any> {
const mod: any = await import("pdfkit"); // exact package name
return mod?.default ?? mod;
}

async function loadFontkit(): Promise<any> {
const mod: any = await import("fontkit");
return mod?.default ?? mod;
}

/* ---------- main ---------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const PDFDocument = await loadPDFKit();
const fontkit = await loadFontkit();

const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), bottom: mm(22), left: mm(18), right: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

// Stream to buffer
const chunks: Buffer[] = [];
const finished = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("end", () => resolve(Buffer.concat(chunks)));
doc.on("error", reject);
});

// Register fontkit on the instance/prototype (covers all builds)
try {
if (typeof doc.registerFontkit === "function") {
doc.registerFontkit(fontkit);
} else if (typeof (PDFDocument as any).prototype.registerFontkit !== "function") {
(PDFDocument as any).prototype.registerFontkit = function (fk: any) {
(this as any)._fontkit = fk;
return this;
};
doc.registerFontkit(fontkit);
} else {
doc.registerFontkit(fontkit);
}
} catch {
// continue; we'll still embed the TTF below
}

// Locate Inter-Regular.ttf (your repo ships this)
const interPath =
findFirstExisting([
process.env.INVOICE_TTF_PATH || "",
path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"),
path.join(process.cwd(), "public", "Inter-Regular.ttf"),
path.join(process.cwd(), "fonts", "Inter-Regular.ttf"),
path.join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf"),
]) || null;

if (!interPath) {
// We *must* embed a real TTF to avoid Helvetica AFM lookup in bundled envs.
doc.end();
throw new Error(
"[invoice] Inter-Regular.ttf not found. Place it at public/fonts/Inter-Regular.ttf or set INVOICE_TTF_PATH."
);
}

const interData = fs.readFileSync(interPath);
doc.registerFont("Body", interData);
doc.font("Body"); // <- CRITICAL: select before any .text() calls (prevents AFM use)

/* ---------- header (optional logo) ---------- */

try {
const logoPath =
findFirstExisting(
["png", "jpg", "jpeg", "webp"].map((ext) =>
path.join(process.cwd(), "public", `logo.${ext}`)
)
) || null;

if (logoPath) {
const maxW = mm(36);
const y0 = doc.y;
doc.image(logoPath, doc.page.margins.left, y0, { width: maxW });
doc
.fillColor("#0f172a")
.fontSize(18)
.text(`${brand} — Invoice`, doc.page.margins.left + maxW + mm(6), y0 + mm(3));
} else {
doc.fillColor("#0f172a").fontSize(18).text(`${brand} — Invoice`);
}
} catch {
doc.fillColor("#0f172a").fontSize(18).text(`${brand} — Invoice`);
}

doc.moveDown(0.25);
doc
.fontSize(10)
.fillColor("#475569")
.text(`Order ID: ${order.id}`)
.text(`Date: ${fmtLK(order.createdAt)}`);

doc.moveDown(0.5);
drawLine(doc);

/* ---------- Billing / Shipping ---------- */

doc.moveDown(0.6);
const startY = doc.y;
const colW =
(doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(4);

// Billing
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

// Shipping
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

/* ---------- Payment / Notes ---------- */

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

/* ---------- Items table ---------- */

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

// Head
doc.fontSize(10).fillColor("#334155");
doc.text("Item", col.item, tableTop, { width: mm(120) });
doc.text("Qty", col.qty, tableTop, { width: mm(20), align: "right" });
doc.text("Price", col.price, tableTop, { width: mm(25), align: "right" });
doc.text("Total", col.total, tableTop, { width: mm(25), align: "right" });

const rowGap = mm(7);
let y = tableTop + mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.rightEdge, y).stroke();

// Lines
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
addRow(
`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`,
"-" + money(order.promoDiscount)
);
}
addRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
addRow("Grand Total", money(order.total), true);

/* ---------- Footer (centered) ---------- */

doc.moveDown(1);
drawLine(doc);
doc
.fontSize(9)
.fillColor("#64748b")
.text(
`© ${new Date().getFullYear()} ${brand} · 35/24, Udaperadeniya, Peradeniya · www.manny.lk · +94 76 070 3523 · info@manny.lk`,
{ align: "center" }
);

doc.end();
return finished;
}

/* ---------- util ---------- */

function drawLine(doc: any) {
const left = doc.page.margins.left;
const right = doc.page.width - doc.page.margins.right;
doc.strokeColor("#e5e7eb").moveTo(left, doc.y).lineTo(right, doc.y).stroke();
}
