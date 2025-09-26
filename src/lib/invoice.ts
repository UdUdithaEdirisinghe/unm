// src/lib/invoice.ts
/**
* Stable PDF invoice generator for Next.js + Vercel:
* - Imports "pdfkit" normally (no internal subpaths that break in lambdas).
* - Embeds a TTF before first text → avoids AFM file lookups entirely.
* - Resolves font/logo via import.meta.url (bundler-friendly), with /public fallbacks.
* - Always returns a Buffer; never throws just because an asset is missing.
*/

import type { OrderEmail } from "./mail";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ----------------- utils ----------------- */

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

function readIfExists(p: string): Buffer | null {
try {
return fs.existsSync(p) ? fs.readFileSync(p) : null;
} catch {
return null;
}
}

function readNearHere(rel: string): Buffer | null {
try {
const url = new URL(rel, import.meta.url);
return fs.readFileSync(fileURLToPath(url));
} catch {
return null;
}
}

/* Company meta */
function getCompany(brand: string) {
return {
brand,
address: process.env.COMPANY_ADDRESS || "35/24, Udaperadeniya, Peradeniya",
phone: process.env.COMPANY_PHONE || "+94 76 070 3523",
email: process.env.MAIL_TO_CONTACT || "info@manny.lk",
website: process.env.NEXT_PUBLIC_SITE_URL || "https://www.manny.lk",
};
}

/* ----------------- main ----------------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
// 1) Load pdfkit and fontkit normally
// @ts-ignore: runtime import, types provided by @types/pdfkit
const PDFDocument = (await import("pdfkit")).default ?? (await import("pdfkit"));
let fontkit: any = null;
try {
// @ts-ignore
const fk = await import("fontkit");
fontkit = fk.default ?? fk;
} catch {
fontkit = null;
}

// 2) Create doc + buffer stream
const doc: any = new (PDFDocument as any)({
size: "A4",
margins: { top: mm(18), right: mm(18), bottom: mm(18), left: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

const chunks: Buffer[] = [];
const done = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));
});

// 3) Embed TTF BEFORE any text so pdfkit never touches AFM
try {
const ttf =
// preferred: ship the font with the server chunk
readNearHere("./assets/Inter-Regular.ttf") ||
// fallback: from /public (works locally)
readIfExists(path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"));

if (ttf && fontkit) {
if (typeof doc.registerFontkit === "function") doc.registerFontkit(fontkit);
else (doc as any)._fontkit = fontkit;
doc.registerFont("Body", ttf);
doc.font("Body");
} else {
// still safe: pick a built-in name but we already won’t touch it
// because we won’t call text before setting "Body" if ttf exists.
doc.font("Helvetica");
}
} catch {
// ignore; pdf will still be produced
}

// 4) Header with logo + company block
const company = getCompany(brand);
try {
const logo =
readNearHere("./assets/manny-logo.png") ||
readIfExists(path.join(process.cwd(), "public", "logo", "manny-logo.png"));

const headerY = doc.y;
if (logo) {
doc.image(logo, doc.page.margins.left, headerY, { width: mm(26) });
doc.fillColor("#0f172a").fontSize(18).text(company.brand, doc.page.margins.left + mm(32), headerY + 2);
doc.fontSize(11).fillColor("#334155").text("Invoice", doc.page.margins.left + mm(32), headerY + 12);
} else {
doc.fillColor("#0f172a").fontSize(18).text(company.brand);
doc.fontSize(11).fillColor("#334155").text("Invoice");
}

const rightX = doc.page.width - doc.page.margins.right - mm(80);
doc
.fontSize(9)
.fillColor("#334155")
.text(company.address, rightX, headerY, { width: mm(80), align: "right" })
.text(`Phone: ${company.phone}`, rightX, doc.y, { width: mm(80), align: "right" })
.text(company.email, rightX, doc.y, { width: mm(80), align: "right" })
.text(company.website, rightX, doc.y, { width: mm(80), align: "right" });

doc.moveDown(0.8);
hr(doc);
} catch {
// keep going
}

// 5) Meta row
doc.moveDown(0.6);
const metaY = doc.y;
const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(6);

doc.fontSize(10).fillColor("#475569");
doc.text(`Order ID: ${order.id}`, doc.page.margins.left, metaY, { width: colW });
doc.text(`Date: ${fmtLK(order.createdAt)}`, doc.page.margins.left, doc.y, { width: colW });
doc.text(
`Payment: ${order.paymentMethod === "BANK" ? "Direct Bank Transfer" : "Cash on Delivery"}`,
doc.page.margins.left + colW + mm(12),
metaY,
{ width: colW }
);

doc.moveDown(0.6);
hr(doc);

// 6) Addresses
doc.moveDown(0.6);
const addrTop = doc.y;

doc.fontSize(11).fillColor("#0f172a").text("Billing", doc.page.margins.left, addrTop);
doc
.fontSize(10)
.fillColor("#334155")
.text(
`${order.customer.firstName} ${order.customer.lastName}\n` +
`${order.customer.address}, ${order.customer.city}${order.customer.postal ? " " + order.customer.postal : ""}\n` +
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
doc.fontSize(10).fillColor("#334155").text("Same as billing", doc.page.margins.left + colW + mm(12), doc.y, {
width: colW,
});
}

doc.moveDown(0.6);
hr(doc);

// 7) Items
doc.moveDown(0.6);
doc.fontSize(11).fillColor("#0f172a").text("Items");

const tableTop = doc.y + mm(2);
const col = {
item: doc.page.margins.left,
qty: doc.page.margins.left + mm(120),
price: doc.page.margins.left + mm(150),
total: doc.page.margins.left + mm(180),
right: doc.page.width - doc.page.margins.right,
};

doc.fontSize(10).fillColor("#64748b");
doc.text("Item", col.item, tableTop, { width: mm(120) });
doc.text("Qty", col.qty, tableTop, { width: mm(20), align: "right" });
doc.text("Price", col.price, tableTop, { width: mm(25), align: "right" });
doc.text("Total", col.total, tableTop, { width: mm(25), align: "right" });

let y = tableTop + mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.right, y).stroke();

const rowGap = mm(7);
doc.fontSize(10).fillColor("#0f172a");

for (const it of order.items) {
const nextY = y + rowGap;
if (nextY > doc.page.height - doc.page.margins.bottom - mm(50)) {
doc.addPage();
y = doc.y = doc.page.margins.top;

// repeat header row
doc.fontSize(10).fillColor("#64748b");
doc.text("Item", col.item, y, { width: mm(120) });
doc.text("Qty", col.qty, y, { width: mm(20), align: "right" });
doc.text("Price", col.price, y, { width: mm(25), align: "right" });
doc.text("Total", col.total, y, { width: mm(25), align: "right" });

y += mm(6);
doc.strokeColor("#e5e7eb").moveTo(col.item, y).lineTo(col.right, y).stroke();
doc.fontSize(10).fillColor("#0f172a");
}

doc.text(it.name, col.item, y, { width: mm(120) });
doc.text(String(it.quantity), col.qty, y, { width: mm(20), align: "right" });
doc.text(money(it.price), col.price, y, { width: mm(25), align: "right" });
doc.text(money(it.price * it.quantity), col.total, y, { width: mm(25), align: "right" });

y = nextY;
doc.strokeColor("#f1f5f9").moveTo(col.item, y - mm(2)).lineTo(col.right, y - mm(2)).stroke();
}

// 8) Totals
doc.moveDown(1);
const labelX = col.total - mm(50);
const valueX = col.total;
const valueW = mm(40);

const totalRow = (label: string, value: string, bold = false) => {
const y0 = doc.y;
doc.fontSize(10).fillColor("#334155").text(label, labelX, y0, { width: mm(45), align: "right" });
doc.fontSize(bold ? 12 : 10).fillColor("#0f172a").text(value, valueX, y0, { width: valueW, align: "right" });
};

totalRow("Subtotal", money(order.subtotal));
if (order.promoDiscount && order.promoDiscount > 0) {
totalRow(`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`, "-" + money(order.promoDiscount));
}
totalRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
totalRow("Grand Total", money(order.total), true);

// 9) Notes
if (order.customer.notes) {
doc.moveDown(0.8);
hr(doc);
doc.moveDown(0.4);
doc.fontSize(11).fillColor("#0f172a").text("Notes");
doc.fontSize(10).fillColor("#334155").text(order.customer.notes, {
width: col.right - doc.page.margins.left,
});
}

// 10) Footer (centered)
doc.moveDown(1);
hr(doc);
const footer = `© ${new Date().getFullYear()} ${company.brand} — All rights reserved.`;
doc
.fontSize(9)
.fillColor("#64748b")
.text(footer, doc.page.margins.left, doc.y + mm(2), {
width: col.right - doc.page.margins.left,
align: "center",
});

doc.end();
return done;
}

/* ---- helpers ---- */
function hr(doc: any) {
const L = doc.page.margins.left;
const R = doc.page.width - doc.page.margins.right;
doc.strokeColor("#e5e7eb").moveTo(L, doc.y).lineTo(R, doc.y).stroke();
}
