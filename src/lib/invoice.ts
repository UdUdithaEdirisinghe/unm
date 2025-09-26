// src/lib/invoice.ts
/**
* Zero-dependency PDF invoice (basic) — no pdfkit/fontkit.
* - Generates a valid 1-page A4 PDF by hand (objects/xref).
* - Returns Buffer for Nodemailer attachment.
* - Keeps your order fields, LKR formatting, LK date.
* - Avoids all font/AFM bundling issues.
*/

import type { OrderEmail } from "./mail";

/* ---------- utils ---------- */

const A4 = { w: 595.28, h: 841.89 }; // pt
const LEFT = 50; // left margin
const TOP = 780; // starting Y for text block
const LEADING = 16; // line height

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

/** Escape text for PDF literal strings */
function pdfEscape(s: string) {
return String(s)
.replace(/\\/g, "\\\\")
.replace(/\(/g, "\\(")
.replace(/\)/g, "\\)")
.replace(/\r/g, " ")
.replace(/\n/g, "\\n");
}

/** Build a content stream from lines (each line is drawn with T*) */
function buildContent(lines: string[], fontSize = 11) {
// We use Helvetica (built-in PDF font; no files needed) — this is *inside the PDF*,
// not a server AFM lookup. No dependencies required.
const headerSize = 16;
const text = [
"BT",
"/F1 " + headerSize + " Tf",
`${LEFT} ${TOP} Td`,
(lines.shift() ? `(${pdfEscape(lines[0])}) Tj` : "() Tj"),
`${headerSize + 4} TL`,
...lines.slice(1).map(() => "T*"),
"ET",
];

// But we also want normal body lines; easier: reopen text object and draw all:
// We'll rebuild properly:
const all = [
"BT",
"/F1 " + headerSize + " Tf",
`${LEFT} ${TOP} Td`,
`(${pdfEscape(lines[0] ?? "")}) Tj`,
"ET",
"BT",
"/F1 " + fontSize + " Tf",
`${LEFT} ${TOP - (headerSize + 10)} Td`,
`${LEADING} TL`,
...lines.slice(1).map((ln) => `(${pdfEscape(ln)}) Tj T*`),
"ET",
].join("\n");

const bytes = Buffer.from(all, "utf8");
return { stream: `<< /Length ${bytes.length} >>\nstream\n${all}\nendstream\n`, length: bytes.length };
}

/** Low-level PDF writer */
function makePDF(objects: string[]) {
let pdf = "%PDF-1.4\n";
const offsets: number[] = [];
for (let i = 0; i < objects.length; i++) {
offsets[i] = Buffer.byteLength(pdf, "utf8");
pdf += `${i + 1} 0 obj\n${objects[i]}endobj\n`;
}
const xrefPos = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += `0000000000 65535 f \n`;
for (const off of offsets) {
pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
return Buffer.from(pdf, "utf8");
}

/* ---------- public API ---------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
// Build the visible lines (simple, readable invoice)
const lines: string[] = [];

// Title (first line is used as big header)
lines.push(`${brand} — Invoice`);

// Meta
lines.push(`Order ID: ${order.id}`);
lines.push(`Date: ${fmtLK(order.createdAt)}`);
lines.push("");

// Billing
lines.push("Billing");
lines.push(
`${order.customer.firstName} ${order.customer.lastName}`.trim()
);
lines.push(
`${order.customer.address}, ${order.customer.city}${order.customer.postal ? " " + order.customer.postal : ""}`
);
if (order.customer.phone) lines.push(`Phone: ${order.customer.phone}`);
lines.push(`Email: ${order.customer.email}`);
lines.push("");

// Shipping
lines.push("Shipping");
if (order.customer.shipToDifferent) {
const s = order.customer.shipToDifferent;
lines.push(`${s.name || `${order.customer.firstName} ${order.customer.lastName}`}`.trim());
lines.push(`${s.address}, ${s.city}${s.postal ? " " + s.postal : ""}`);
if (s.phone) lines.push(`Phone: ${s.phone}`);
} else {
lines.push("Same as billing");
}
lines.push("");

// Items
lines.push("Items");
for (const it of order.items) {
const total = it.price * it.quantity;
lines.push(`• ${it.name} ×${it.quantity} @ ${money(it.price)} = ${money(total)}`);
}
lines.push("");

// Totals
lines.push(`Subtotal: ${money(order.subtotal)}`);
if (order.promoDiscount && order.promoDiscount > 0) {
lines.push(
`Discount${order.promoCode ? ` (${order.promoCode})` : ""}: -${money(order.promoDiscount)}`
);
}
lines.push(`Shipping: ${order.freeShipping ? "Free" : money(order.shipping)}`);
lines.push(`Grand Total: ${money(order.total)}`);
lines.push("");

// Footer (centered visually enough in email PDF viewers)
const footer = `© ${new Date().getFullYear()} ${brand} · 35/24, Udaperadeniya, Peradeniya · www.manny.lk · +94 76 070 3523 · info@manny.lk`;
lines.push(footer);

// Content stream
const content = buildContent(lines, 11);

// 1) Catalog
const obj1 = `<< /Type /Catalog /Pages 2 0 R >>\n`;

// 2) Pages
const obj2 = `<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n`;

// 3) Page
const obj3 =
`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\n`;

// 4) Font (built-in Helvetica)
const obj4 = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n`;

// 5) Content stream
const obj5 = content.stream;

// Assemble
return makePDF([obj1, obj2, obj3, obj4, obj5]);
}
