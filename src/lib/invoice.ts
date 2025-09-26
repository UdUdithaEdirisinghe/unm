// src/lib/invoice.ts
/**
* Old-school, stamp-ready invoice PDF (no font files, no AFM lookups).
* - ASCII-only content, Type1 Helvetica (base font) → works on Vercel serverless.
* - Pixel-clean centering & right-alignment, robust wrapping.
* - Signature/Seal box only (no notes).
* - Meta box includes Payment method (COD/Direct Bank Transfer).
*/

import type { OrderEmail } from "./mail";

const BRAND = {
name: "Manny.lk",
address: "35/24, Udaperadeniya, Peradeniya",
phone: "+94 76 070 3523",
email: "info@manny.lk",
web: "www.manny.lk",
};

const A4 = { w: 595.28, h: 841.89 }; // pt
const MARGIN = 42; // pt

const FONT = {
body: "F1",
size: { title: 22, normal: 11, small: 9 },
avgChar(size: number) {
return size * 0.48; // ~Helvetica average glyph width
},
};

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

function ascii(s: string) {
return (s || "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "?");
}
function esc(s: string) {
return ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function BT(x: number, y: number, size: number, font = FONT.body) {
return `BT\n/${font} ${size} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n`;
}
const ET = "ET\n";
const TL = (v: number) => `${v.toFixed(2)} TL\n`;
const T = (txt: string) => `(${esc(txt)}) Tj\n`;
const TSTAR = "T*\n";

function line(x1: number, y1: number, x2: number, y2: number) {
return `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}
function box(x: number, y: number, w: number, h: number) {
return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
}
function stream(body: string) {
const b = Buffer.from(body, "utf8");
return `<< /Length ${b.length} >>\nstream\n${body}endstream\n`;
}
function assemble(objs: string[]) {
let out = "%PDF-1.4\n";
const offs: number[] = [];
for (let i = 0; i < objs.length; i++) {
offs[i] = Buffer.byteLength(out, "utf8");
out += `${i + 1} 0 obj\n${objs[i]}endobj\n`;
}
const xref = Buffer.byteLength(out, "utf8");
out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
for (const o of offs) out += `${o.toString().padStart(10, "0")} 00000 n \n`;
out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
return Buffer.from(out, "utf8");
}

function wrapToWidth(text: string, maxWidthPt: number, size: number): string[] {
const words = ascii(text).split(/\s+/).filter(Boolean);
const perChar = FONT.avgChar(size);
const maxChars = Math.max(1, Math.floor(maxWidthPt / perChar));
const lines: string[] = [];
let cur = "";
for (const w of words) {
const cand = cur ? cur + " " + w : w;
if (cand.length <= maxChars) cur = cand;
else {
if (cur) lines.push(cur);
if (w.length > maxChars) {
for (let i = 0; i < w.length; i += maxChars) lines.push(w.slice(i, i + maxChars));
cur = "";
} else cur = w;
}
}
if (cur) lines.push(cur);
return lines;
}

function totalsRow(
s: string,
x: number,
y: number,
w: number,
label: string,
value: string,
bold = false
) {
const size = bold ? 12 : FONT.size.normal;
const valueWidth = (ascii(value).length || 1) * FONT.avgChar(size);
const vx = x + w - 10 - valueWidth;
s += BT(x + 10, y, FONT.size.normal) + T(label) + ET;
s += BT(Math.max(x + 10, vx), y, size) + T(value) + ET;
return s;
}

/* -------------------------------- PDF -------------------------------- */

export async function createInvoicePdf(order: OrderEmail, brandName: string): Promise<Buffer> {
const brand = { ...BRAND, name: brandName || BRAND.name };

const left = MARGIN;
const right = A4.w - MARGIN;
const top = A4.h - MARGIN;
const width = right - left;

const lead = 14;
const rowH = 20;

let y = top;
let body = "";

/* Header band */
const headerH = 66;
const titleW = 170;
const titleX = right - titleW;
body += box(left, y - headerH, width, headerH);
body += line(titleX, y - headerH, titleX, y);

const brandPad = 12;
const brandColW = width - titleW;
const brandLineW = brandColW - brandPad * 2;

const brandLines: string[] = [
brand.name,
...wrapToWidth(brand.address, brandLineW, FONT.size.normal),
`${brand.web} | ${brand.phone} | ${brand.email}`,
];
body += BT(left + brandPad, y - 20, FONT.size.normal) + TL(lead);
for (const ln of brandLines) body += T(ln) + TSTAR;
body += ET;

// Center “INVOICE” in right header box
const title = "INVOICE";
const ts = FONT.size.title;
const tw = title.length * FONT.avgChar(ts);
const tx = titleX + (titleW - tw) / 2;
const boxTop = y - headerH;
const boxMidY = boxTop + headerH / 2;
const baseline = boxMidY - ts * 0.32;
body += BT(Math.max(titleX + 6, tx), baseline, ts) + T(title) + ET;

y -= headerH + 12;

/* Meta (Order + Date + Payment) */
const metaH = 58;
body += box(left, y - metaH, width, metaH);
body += BT(left + 12, y - 18, FONT.size.normal) + TL(lead);
body += T(`Order ID: ${ascii(order.id)}`) + TSTAR;
body += T(`Date: ${fmtLK(order.createdAt)}`) + TSTAR;
const pay =
order.paymentMethod === "BANK"
? "Direct Bank Transfer"
: order.paymentMethod === "COD"
? "Cash on Delivery"
: ascii(order.paymentMethod || "Payment");
body += T(`Payment: ${pay}`) + ET;
y -= metaH + 12;

/* Billing / Shipping */
const gutter = 12;
const colW = (width - gutter) / 2;
const pad = 10;
const detailsH = 110;

// Billing
body += box(left, y - detailsH, colW, detailsH);
let yy = y - 18;
body += BT(left + pad, yy, FONT.size.normal) + T("Billing") + ET;
yy -= 14;
const billingLines = [
`${ascii(order.customer.firstName)} ${ascii(order.customer.lastName)}`.trim(),
...wrapToWidth(
`${ascii(order.customer.address)}, ${ascii(order.customer.city)}${
order.customer.postal ? " " + ascii(order.customer.postal) : ""
}`,
colW - pad * 2,
FONT.size.normal
),
...(order.customer.phone ? [`Phone: ${ascii(order.customer.phone)}`] : []),
`Email: ${ascii(order.customer.email)}`,
];
for (const ln of billingLines) {
body += BT(left + pad, yy, FONT.size.normal) + T(ln) + ET;
yy -= 14;
}

// Shipping
const shipX = left + colW + gutter;
body += box(shipX, y - detailsH, colW, detailsH);
yy = y - 18;
body += BT(shipX + pad, yy, FONT.size.normal) + T("Shipping") + ET;
yy -= 14;
if (order.customer.shipToDifferent) {
const s = order.customer.shipToDifferent;
const shipLines = [
ascii(s.name || `${order.customer.firstName} ${order.customer.lastName}`),
...wrapToWidth(
`${ascii(s.address)}, ${ascii(s.city)}${s.postal ? " " + ascii(s.postal) : ""}`,
colW - pad * 2,
FONT.size.normal
),
...(s.phone ? [`Phone: ${ascii(s.phone)}`] : []),
];
for (const ln of shipLines) {
body += BT(shipX + pad, yy, FONT.size.normal) + T(ln) + ET;
yy -= 14;
}
} else {
body += BT(shipX + pad, yy, FONT.size.normal) + T("Same as billing") + ET;
}

y -= detailsH + 14;

/* Items table */
const headH = 24;
const descW = Math.round(width * 0.58);
const qtyW = Math.round(width * 0.10);
const priceW = Math.round(width * 0.14);
const totalW = width - (descW + qtyW + priceW);
const xDesc = left;
const xQty = xDesc + descW;
const xPrice = xQty + qtyW;
const xTotal = xPrice + priceW;

body += box(left, y - headH, width, headH);
body += line(xQty, y - headH, xQty, y);
body += line(xPrice, y - headH, xPrice, y);
body += line(xTotal, y - headH, xTotal, y);
body += BT(xDesc + 8, y - 16, FONT.size.normal) + T("Item") + ET;
body += BT(xQty + 8, y - 16, FONT.size.normal) + T("Qty") + ET;
body += BT(xPrice + 8, y - 16, FONT.size.normal) + T("Price") + ET;
body += BT(xTotal + 8, y - 16, FONT.size.normal) + T("Total") + ET;
y -= headH;

for (const it of order.items) {
body += box(left, y - rowH, width, rowH);
body += line(xQty, y - rowH, xQty, y);
body += line(xPrice, y - rowH, xPrice, y);
body += line(xTotal, y - rowH, xTotal, y);
body += BT(xDesc + 8, y - 13, FONT.size.normal) + T(ascii(it.name)) + ET;
body += BT(xQty + 8, y - 13, FONT.size.normal) + T(String(it.quantity)) + ET;
body += BT(xPrice + 8, y - 13, FONT.size.normal) + T(money(it.price)) + ET;
body += BT(xTotal + 8, y - 13, FONT.size.normal) + T(money(it.price * it.quantity)) + ET;
y -= rowH;
}

y -= 12;

/* Totals (right column) — width matches signature box */
const hasDiscount = !!(order.promoDiscount && order.promoDiscount > 0);
const rows = 3 + (hasDiscount ? 1 : 0);
const totalsRowH = rowH;
const totalsH = rows * totalsRowH;
const totalsW = 280; // fixed width → same as signature box
const totalsX = right - totalsW;

body += box(totalsX, y - totalsH, totalsW, totalsH);

let ty = y - 14;
body = totalsRow(body, totalsX, ty, totalsW, "Subtotal", money(order.subtotal));
ty -= totalsRowH;
if (hasDiscount) {
const label = `Discount ${order.promoCode ? "(" + ascii(order.promoCode) + ")" : "(FD)"}`;
body = totalsRow(body, totalsX, ty, totalsW, label, "-" + money(order.promoDiscount || 0));
ty -= totalsRowH;
}
body = totalsRow(
body,
totalsX,
ty,
totalsW,
"Shipping",
order.freeShipping ? "Free" : money(order.shipping)
);
ty -= totalsRowH;
body = totalsRow(body, totalsX, ty, totalsW, "Grand Total", money(order.total), true);

y -= totalsH + 16;

/* Signature / Seal — same width as totals, shorter height, label at lower middle */
const sealW = totalsW; // match totals width
const sealH = 110; // a bit smaller height than before
const sealX = totalsX; // align right edges
const sealTop = y - sealH;

body += box(sealX, sealTop, sealW, sealH);

const sigText = "Authorized Signature / Seal";
const sigSize = FONT.size.normal;
const sigWidth = sigText.length * FONT.avgChar(sigSize);
const sigX = sealX + (sealW - sigWidth) / 2;
const sigBaseline = sealTop + 16; // **lower** middle: ~16pt up from bottom edge
body += BT(Math.max(sealX + 8, sigX), sigBaseline, sigSize) + T(sigText) + ET;

y -= sealH + 22;

/* Footer (centered) */
const footer = `(c) ${new Date().getFullYear()} ${brand.name} - All rights reserved.`;
const est = footer.length * FONT.avgChar(FONT.size.small);
const fx = left + (width - est) / 2;
const fy = MARGIN + 18;
body += BT(Math.max(left, fx), fy, FONT.size.small) + T(footer) + ET;

/* Build PDF */
const content = stream(body);
const o1 = `<< /Type /Catalog /Pages 2 0 R >>\n`;
const o2 = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n`;
const o3 = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\n`;
const o4 = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n`;
const o5 = content;

return assemble([o1, o2, o3, o4, o5]);
}
