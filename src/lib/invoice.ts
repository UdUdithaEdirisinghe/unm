// src/lib/invoice.ts
/**
* Old-school, stamp-ready invoice PDF (zero dependencies).
* - Pure PDF objects using built-in Helvetica (no pdfkit/fontkit).
* - Tight A4 layout with consistent grid and no overlaps.
* - ASCII-only output to avoid missing glyphs on mobile viewers.
* - Shows Subtotal, Discount (when present), Shipping, Grand Total.
* - Returns Buffer suitable for Nodemailer attachment.
*/

import type { OrderEmail } from "./mail";

/* ---------------------------- constants ---------------------------- */

const BRAND = {
name: "Manny.lk",
address: "35/24, Udaperadeniya, Peradeniya",
phone: "+94 76 070 3523",
email: "info@manny.lk",
web: "www.manny.lk",
};

// A4 page in points
const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 42; // page margin

/* ---------------------------- helpers ------------------------------ */

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

/** Force ASCII for built-in Helvetica */
function ascii(s: string) {
return (s || "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "?");
}
/** Escape for PDF literal strings */
function pdfEsc(s: string) {
return ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// text helpers
function BT(x: number, y: number, size: number) {
return `BT\n/F1 ${size} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n`;
}
const ET = "ET\n";
const TSTAR = "T*\n";
function TL(v: number) {
return `${v.toFixed(2)} TL\n`;
}
function T(txt: string) {
return `(${pdfEsc(txt)}) Tj\n`;
}

// graphics
function line(x1: number, y1: number, x2: number, y2: number) {
return `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}
function box(x: number, y: number, w: number, h: number) {
return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
}

// content stream wrapper
function stream(body: string) {
const b = Buffer.from(body, "utf8");
return `<< /Length ${b.length} >>\nstream\n${body}endstream\n`;
}

// assemble barebones PDF
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

/* ------------------------------ layout ------------------------------ */

export async function createInvoicePdf(order: OrderEmail, brandName: string): Promise<Buffer> {
const brand = { ...BRAND, name: brandName || BRAND.name };

// grid
const left = MARGIN;
const right = A4.w - MARGIN;
const width = right - left;
const top = A4.h - MARGIN;

// type
const big = 22;
const normal = 11;
const small = 9;
const lead = 14;

let y = top;
let s = "";

/* ---------- header band ---------- */
const headerH = 64;
s += box(left, y - headerH, width, headerH);

// brand block (left)
s += BT(left + 12, y - 20, normal);
s += TL(14);
s += T(brand.name);
s += TSTAR;
s += T(`${brand.address}`);
s += TSTAR;
s += T(`${brand.web} | ${brand.phone} | ${brand.email}`);
s += ET;

// title (right)
s += BT(right - 130, y - 26, big);
s += T("INVOICE");
s += ET;

y -= headerH + 10;

/* ---------- order meta ---------- */
const metaH = 44;
s += box(left, y - metaH, width, metaH);
s += BT(left + 12, y - 16, normal) + TL(14);
s += T(`Order ID: ${ascii(order.id)}`) + TSTAR + T(`Date: ${fmtLK(order.createdAt)}`) + ET;

y -= metaH + 12;

/* ---------- billing & shipping ---------- */
const gutter = 12;
const colW = (width - gutter) / 2;
const detailsH = 96;

// billing
s += box(left, y - detailsH, colW, detailsH);
s += BT(left + 10, y - 18, normal) + TL(14);
s += T("Billing") + TSTAR;
s += T(`${ascii(order.customer.firstName)} ${ascii(order.customer.lastName)}`.trim()) + TSTAR;
s += T(
`${ascii(order.customer.address)}, ${ascii(order.customer.city)}${
order.customer.postal ? " " + ascii(order.customer.postal) : ""
}`
);
if (order.customer.phone) {
s += TSTAR + T(`Phone: ${ascii(order.customer.phone)}`);
}
s += TSTAR + T(`Email: ${ascii(order.customer.email)}`) + ET;

// shipping
const shipX = left + colW + gutter;
s += box(shipX, y - detailsH, colW, detailsH);
s += BT(shipX + 10, y - 18, normal) + TL(14);
s += T("Shipping") + TSTAR;
if (order.customer.shipToDifferent) {
const sh = order.customer.shipToDifferent;
s += T(
`${ascii(sh.name || `${order.customer.firstName} ${order.customer.lastName}`)}`
);
s += TSTAR;
s += T(
`${ascii(sh.address)}, ${ascii(sh.city)}${
sh.postal ? " " + ascii(sh.postal) : ""
}`
);
if (sh.phone) s += TSTAR + T(`Phone: ${ascii(sh.phone)}`);
} else {
s += T("Same as billing");
}
s += ET;

y -= detailsH + 14;

/* ---------- items table ---------- */
const headH = 24;
const rowH = 20;

// column widths (sum to width)
const descW = Math.round(width * 0.58);
const qtyW = Math.round(width * 0.10);
const priceW = Math.round(width * 0.14);
const totalW = width - (descW + qtyW + priceW);

const xDesc = left;
const xQty = xDesc + descW;
const xPrice = xQty + qtyW;
const xTotal = xPrice + priceW;

// header row box + column rules
s += box(left, y - headH, width, headH);
s += line(xQty, y - headH, xQty, y);
s += line(xPrice, y - headH, xPrice, y);
s += line(xTotal, y - headH, xTotal, y);

s += BT(xDesc + 8, y - 16, normal) + T("Item") + ET;
s += BT(xQty + 8, y - 16, normal) + T("Qty") + ET;
s += BT(xPrice + 8, y - 16, normal) + T("Price") + ET;
s += BT(xTotal + 8, y - 16, normal) + T("Total") + ET;

y -= headH;

// item rows
for (const it of order.items) {
s += box(left, y - rowH, width, rowH);
s += line(xQty, y - rowH, xQty, y);
s += line(xPrice, y - rowH, xPrice, y);
s += line(xTotal, y - rowH, xTotal, y);

s += BT(xDesc + 8, y - 13, normal) + T(ascii(it.name)) + ET;
s += BT(xQty + 8, y - 13, normal) + T(String(it.quantity)) + ET;
s += BT(xPrice + 8, y - 13, normal) + T(money(it.price)) + ET;
s += BT(xTotal + 8, y - 13, normal) + T(money(it.price * it.quantity)) + ET;

y -= rowH;
}

y -= 10;

/* ---------- totals panel (right aligned) ---------- */
const hasDiscount = !!(order.promoDiscount && order.promoDiscount > 0);
const rows = 3 + (hasDiscount ? 1 : 0); // Subtotal + (Discount) + Shipping + Grand
const totalsH = rows * rowH;
const totalsW = Math.max(210, Math.round(width * 0.42)); // keep readable
const totalsX = right - totalsW;

s += box(totalsX, y - totalsH, totalsW, totalsH);

const labPad = 10;
const valPad = 10;

let ty = y - 14;
function totalRow(label: string, value: string, bold = false) {
// label (left)
s += BT(totalsX + labPad, ty, normal) + T(label) + ET;

// value (right)
// crude right align by shifting back roughly by character width
const est = Math.min(100, value.length * (bold ? 5.2 : 5));
const vx = totalsX + totalsW - valPad - est;
s += BT(vx, ty, bold ? 12 : normal) + T(value) + ET;

ty -= rowH;
}

totalRow("Subtotal", money(order.subtotal));
if (hasDiscount) {
totalRow(
`Discount${order.promoCode ? " (" + ascii(order.promoCode) + ")" : ""}`,
"-" + money(order.promoDiscount || 0)
);
}
totalRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
totalRow("Grand Total", money(order.total), true);

y -= totalsH + 16;

/* ---------- notes (if any) ---------- */
if (order.customer.notes) {
const notesH = 64;
const notesW = width - (totalsW + 16);
s += box(left, y - notesH, notesW, notesH);
s += BT(left + 10, y - 18, normal) + TL(14);
s += T("Order notes") + TSTAR + T(ascii(order.customer.notes)) + ET;
y -= notesH + 16;
}

/* ---------- signature/seal ---------- */
const sealW = 180;
const sealH = 70;
const sealX = right - sealW;
s += box(sealX, y - sealH, sealW, sealH);
s += BT(sealX + 16, y - 22, normal) + T("Authorized Signature / Seal") + ET;

/* ---------- footer (centered) ---------- */
const footer = `(c) ${new Date().getFullYear()} ${brand.name} — All rights reserved · ${brand.address} · ${brand.web} · ${brand.phone} · ${brand.email}`;
const footerY = MARGIN + 18;

// center horizontally by estimating width
const est = Math.min(width, footer.length * 4.6);
const fx = left + (width - est) / 2;

s += BT(fx, footerY, small) + T(footer) + ET;

/* ---------- build PDF ---------- */
const content = stream(s);
const o1 = `<< /Type /Catalog /Pages 2 0 R >>\n`;
const o2 = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n`;
const o3 = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\n`;
const o4 = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n`;
const o5 = content;

return assemble([o1, o2, o3, o4, o5]);
}
