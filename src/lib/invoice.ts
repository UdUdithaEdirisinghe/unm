// src/lib/invoice.ts
/**
* Old-school, stamp-ready PDF invoice (zero dependencies).
* - No pdfkit / fontkit. Pure PDF objects + built-in Helvetica.
* - A4 layout with boxes, table lines, and a signature/seal area.
* - ASCII-only content to avoid glyph issues in mobile viewers.
* - Returns Buffer for Nodemailer attachment.
*/
import type { OrderEmail } from "./mail";

/* ---------------------------- config ---------------------------- */

const BRAND = {
name: "Manny.lk",
address: "35/24, Udaperadeniya, Peradeniya",
phone: "+94 76 070 3523",
email: "info@manny.lk",
web: "www.manny.lk",
};

const A4 = { w: 595.28, h: 841.89 }; // points
const MARGIN = 40;

/* ---------------------------- utils ----------------------------- */

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

/** Force ASCII to avoid missing glyphs in Type1 built-in Helvetica */
function toAscii(input: string): string {
return (input || "")
.normalize("NFKD")
.replace(/[^\x20-\x7E]/g, "?"); // replace non-ASCII
}

/** Escape for PDF literal strings */
function pdfEscape(s: string) {
return toAscii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Begin text block: set font, size, position */
function bt(x: number, y: number, size: number) {
return `BT\n/F1 ${size} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n`;
}
/** End text block */
function et() {
return "ET\n";
}
/** Draw one line of text at current text position */
function tj(txt: string) {
return `(${pdfEscape(txt)}) Tj\n`;
}
/** Move to next line (leading) */
function tStar() {
return "T*\n";
}
/** Set leading (line height) for T* */
function setLeading(pt: number) {
return `${pt.toFixed(2)} TL\n`;
}

/** Draw a stroked line */
function line(x1: number, y1: number, x2: number, y2: number) {
return `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}
/** Draw a stroked rectangle */
function rect(x: number, y: number, w: number, h: number) {
return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
}

/** Build one content stream */
function makeStream(body: string) {
const bytes = Buffer.from(body, "utf8");
return `<< /Length ${bytes.length} >>\nstream\n${body}endstream\n`;
}

/** Assemble minimal PDF */
function makePDF(objects: string[]) {
let pdf = "%PDF-1.4\n";
const offsets: number[] = [];
for (let i = 0; i < objects.length; i++) {
offsets[i] = Buffer.byteLength(pdf, "utf8");
pdf += `${i + 1} 0 obj\n${objects[i]}endobj\n`;
}
const xref = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
return Buffer.from(pdf, "utf8");
}

/* ---------------------------- layout ---------------------------- */

export async function createInvoicePdf(order: OrderEmail, brandName: string): Promise<Buffer> {
const brand = { ...BRAND, name: brandName || BRAND.name };

const left = MARGIN;
const right = A4.w - MARGIN;
const top = A4.h - MARGIN;
let y = top;

const leading = 14;
const small = 9;
const normal = 11;
const big = 22;

let s = "";

// Header bar (company name + INVOICE title)
const headerH = 60;
s += rect(left, top - headerH, right - left, headerH); // border
// Company block (left)
s += bt(left + 10, top - 20, normal);
s += setLeading(14);
s += tj(brand.name);
s += tStar();
s += tj(brand.address);
s += tStar();
s += tj(`${brand.web} | ${brand.phone} | ${brand.email}`);
s += et();

// Title "INVOICE" (right)
s += bt(right - 150, top - 24, big);
s += tj("INVOICE");
s += et();

y = top - headerH - 10;

// Meta box (Order info)
const metaH = 46;
s += rect(left, y - metaH, right - left, metaH);
s += bt(left + 10, y - 16, normal);
s += setLeading(14);
s += tj(`Order ID: ${toAscii(order.id)}`);
s += tStar();
s += tj(`Date: ${fmtLK(order.createdAt)}`);
s += et();

// Billing & Shipping boxes (side by side)
y = y - metaH - 12;
const colW = (right - left - 10) / 2;

const billH = 92;
s += rect(left, y - billH, colW, billH);
s += bt(left + 8, y - 16, normal);
s += setLeading(14);
s += tj("Billing");
s += tStar();
s += tj(`${toAscii(order.customer.firstName)} ${toAscii(order.customer.lastName)}`.trim());
s += tStar();
s += tj(`${toAscii(order.customer.address)}, ${toAscii(order.customer.city)}${order.customer.postal ? " " + toAscii(order.customer.postal) : ""}`);
if (order.customer.phone) {
s += tStar();
s += tj(`Phone: ${toAscii(order.customer.phone)}`);
}
s += tStar();
s += tj(`Email: ${toAscii(order.customer.email)}`);
s += et();

s += rect(left + colW + 10, y - billH, colW, billH);
s += bt(left + colW + 18, y - 16, normal);
s += setLeading(14);
s += tj("Shipping");
s += tStar();
if (order.customer.shipToDifferent) {
const sh = order.customer.shipToDifferent;
s += tj(`${toAscii(sh.name || `${order.customer.firstName} ${order.customer.lastName}`)}`.trim());
s += tStar();
s += tj(`${toAscii(sh.address)}, ${toAscii(sh.city)}${sh.postal ? " " + toAscii(sh.postal) : ""}`);
if (sh.phone) {
s += tStar();
s += tj(`Phone: ${toAscii(sh.phone)}`);
}
} else {
s += tj("Same as billing");
}
s += et();

// Items table
y = y - billH - 14;
const rowH = 18;
const tableW = right - left;
const descW = tableW * 0.58;
const qtyW = tableW * 0.10;
const priceW = tableW * 0.15;
const totalW = tableW * 0.17;

// Table header box
const headerRowH = 22;
s += rect(left, y - headerRowH, tableW, headerRowH);
// Column vertical lines
const xDesc = left + 8;
const xQty = left + descW;
const xPrice = xQty + qtyW;
const xTotal = xPrice + priceW;

s += line(xQty, y - headerRowH, xQty, y);
s += line(xPrice, y - headerRowH, xPrice, y);
s += line(xTotal, y - headerRowH, xTotal, y);

s += bt(xDesc, y - 16, normal);
s += tj("Item");
s += et();

s += bt(xQty + 8, y - 16, normal);
s += tj("Qty");
s += et();

s += bt(xPrice + 8, y - 16, normal);
s += tj("Price");
s += et();

s += bt(xTotal + 8, y - 16, normal);
s += tj("Total");
s += et();

// Table rows
y = y - headerRowH;
for (const it of order.items) {
s += rect(left, y - rowH, tableW, rowH);
s += line(xQty, y - rowH, xQty, y);
s += line(xPrice, y - rowH, xPrice, y);
s += line(xTotal, y - rowH, xTotal, y);

s += bt(xDesc, y - 13, normal);
s += tj(toAscii(it.name));
s += et();

s += bt(xQty + 8, y - 13, normal);
s += tj(String(it.quantity));
s += et();

s += bt(xPrice + 8, y - 13, normal);
s += tj(money(it.price));
s += et();

s += bt(xTotal + 8, y - 13, normal);
s += tj(money(it.price * it.quantity));
s += et();

y -= rowH;
}

// Totals box (right side)
y -= 8;
const totalsW = tableW * 0.48;
const totalsX = right - totalsW;
const totalsH = 3 * rowH + (order.promoDiscount && order.promoDiscount > 0 ? rowH : 0);
s += rect(totalsX, y - totalsH, totalsW, totalsH);

const labX = totalsX + 10;
const valX = right - 10;

let ty = y - 13;
function totalRow(label: string, value: string, bold = false) {
s += bt(labX, ty, normal);
s += tj(label);
s += et();

s += bt(valX, ty, bold ? 12 : normal);
// right align by placing slightly left based on text length (simple)
const shift = Math.min(80, value.length * 4.5);
s += `BT\n/F1 ${bold ? 12 : normal} Tf\n${(valX - shift).toFixed(2)} ${ty.toFixed(
2
)} Td\n(${pdfEscape(value)}) Tj\nET\n`;
ty -= rowH;
}

totalRow("Subtotal", money(order.subtotal));
if (order.promoDiscount && order.promoDiscount > 0) {
totalRow(
`Discount${order.promoCode ? " (" + toAscii(order.promoCode) + ")" : ""}`,
"-" + money(order.promoDiscount)
);
}
totalRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
totalRow("Grand Total", money(order.total), true);

y = y - totalsH - 18;

// Notes (if any)
if (order.customer.notes) {
const notesH = 60;
s += rect(left, y - notesH, tableW - 160, notesH);
s += bt(left + 8, y - 16, normal);
s += setLeading(14);
s += tj("Order notes");
s += tStar();
s += tj(toAscii(order.customer.notes));
s += et();
}

// Signature / company seal box (right bottom)
const sealW = 150;
const sealH = 60;
s += rect(right - sealW, y - sealH, sealW, sealH);
s += bt(right - sealW + 12, y - 18, normal);
s += tj("Authorized Signature / Seal");
s += et();

// Footer centered
const footer = `© ${new Date().getFullYear()} ${brand.name} — All rights reserved · ${brand.address} · ${brand.web} · ${brand.phone} · ${brand.email}`;
const footerY = MARGIN + 18;
s += bt(left, footerY, small);
s += tj(footer);
s += et();

// Build the PDF objects
const content = makeStream(s);

const obj1 = `<< /Type /Catalog /Pages 2 0 R >>\n`;
const obj2 = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n`;
const obj3 = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\n`;
const obj4 = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n`;
const obj5 = content;

return makePDF([obj1, obj2, obj3, obj4, obj5]);
}
