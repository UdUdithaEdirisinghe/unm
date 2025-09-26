// src/lib/invoice.ts
/**
* Robust PDF invoice generator for serverless (Vercel) + Next.js.
* Key points:
* - Uses PDFKit *standalone* build to avoid AFM file reads (no ENOENT).
* - If Inter-Regular.ttf exists, we embed it; else we keep using built-ins.
* - If logo exists at /public/logo/manny-logo.png, we draw it.
* - Always resolves with a Buffer (email attachment safe).
*/

import type { OrderEmail } from "./mail";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ----------------------------- utilities ----------------------------- */

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

/** Try a list of dynamic imports until one works */
async function firstImport<T = any>(candidates: string[]): Promise<T> {
let lastErr: unknown;
for (const spec of candidates) {
try {
// @ts-ignore – we intentionally rely on runtime resolution
const mod = await import(spec);
return (mod as any)?.default ?? (mod as any);
} catch (e) {
lastErr = e;
}
}
throw lastErr;
}

/** PDFKit loader – prefer the standalone build */
async function loadPDFKit(): Promise<any> {
// Try known standalone entry points first (handles bundled fonts => no AFM I/O)
return await firstImport<any>([
"pdfkit/js/pdfkit.standalone.js",
"pdfkit/dist/pdfkit.standalone.js",
// Extremely defensive: fall back to the main export if needed
"pdfkit",
]);
}

/** Optional fontkit (not required when using standalone, but enables TTF embedding) */
async function loadFontkit(): Promise<any | null> {
try {
// @ts-ignore
const mod = await import("fontkit");
return (mod as any)?.default ?? (mod as any);
} catch {
return null;
}
}

/** Read a file if it exists (safe on serverless read-only fs) */
function readIfExists(abs: string): Buffer | null {
try {
return fs.existsSync(abs) ? fs.readFileSync(abs) : null;
} catch {
return null;
}
}

/**
* Try to resolve an asset so the bundler includes it in the server chunk
* (works even if /public isn’t copied as-is into the Lambda).
*/
function readAssetNearSource(relFromSrc: string): Buffer | null {
try {
// invoice.ts is in src/lib => resolve against that location at build time
const url = new URL(relFromSrc, import.meta.url);
const p = fileURLToPath(url);
return readIfExists(p);
} catch {
return null;
}
}

/** Get company meta (env-overridable) */
function getCompany(brand: string) {
const address = process.env.COMPANY_ADDRESS || "35/24, Udaperadeniya, Peradeniya";
const phoneRaw = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "94760703523").replace(/[^\d]/g, "");
const phone = phoneRaw.startsWith("94")
? `+94 ${phoneRaw.slice(2, 4)} ${phoneRaw.slice(4, 7)} ${phoneRaw.slice(7)}`
: phoneRaw;
const email = process.env.MAIL_TO_CONTACT || "info@manny.lk";
const website = process.env.NEXT_PUBLIC_SITE_URL || "https://www.manny.lk";
return { brand, address, phone, email, website };
}

/* --------------------------------- main -------------------------------- */

export async function createInvoicePdf(order: OrderEmail, brand: string): Promise<Buffer> {
const PDFDocument = await loadPDFKit();
const fontkit = await loadFontkit();
const company = getCompany(brand);

const doc: any = new PDFDocument({
size: "A4",
margins: { top: mm(18), bottom: mm(18), left: mm(18), right: mm(18) },
bufferPages: true,
pdfVersion: "1.3",
});

// --- stream to buffer
const chunks: Buffer[] = [];
const result = new Promise<Buffer>((resolve, reject) => {
doc.on("data", (c: Buffer) => chunks.push(c));
doc.on("error", reject);
doc.on("end", () => resolve(Buffer.concat(chunks)));
});

// --- fonts (make sure we select a font BEFORE any text)
try {
// Prefer bundler-included asset near source (works on Vercel Lambda)
// Path from src/lib/invoice.ts -> ../../public/fonts/Inter-Regular.ttf
let ttf =
readAssetNearSource("../../public/fonts/Inter-Regular.ttf") ||
// Fallback to runtime project root (dev/local)
readIfExists(path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"));

if (fontkit && ttf) {
if (typeof doc.registerFontkit === "function") doc.registerFontkit(fontkit);
else (doc as any)._fontkit = fontkit; // older/newer shapes
doc.registerFont("Body", ttf);
doc.font("Body");
} else {
// Using standalone build's built-ins. Pick a standard font name explicitly so
// pdfkit doesn’t try to walk to AFM files (standalone has them in-bundle).
doc.font("Helvetica");
}
} catch {
// Even if anything above fails, standalone’s default font will still work.
}

/* ---------- header (logo + brand) ---------- */
try {
const logo =
readAssetNearSource("../../public/logo/manny-logo.png") ||
readIfExists(path.join(process.cwd(), "public", "logo", "manny-logo.png"));
const headerY = doc.y;

if (logo) {
doc.image(logo, doc.page.margins.left, headerY, { width: mm(24) });
doc
.fillColor("#0f172a")
.fontSize(18)
.text(company.brand, doc.page.margins.left + mm(30), headerY + mm(2), { width: mm(120) });
doc.fontSize(11).fillColor("#334155").text("Invoice", doc.page.margins.left + mm(30), headerY + mm(11));
} else {
doc.fillColor("#0f172a").fontSize(18).text(company.brand);
doc.fontSize(11).fillColor("#334155").text("Invoice");
}

// Company block (right)
const rightX = doc.page.width - doc.page.margins.right - mm(72);
const topY = headerY;
doc
.fontSize(9)
.fillColor("#334155")
.text(company.address, rightX, topY, { width: mm(72), align: "right" })
.text(`Phone: ${company.phone}`, rightX, doc.y, { width: mm(72), align: "right" })
.text(company.email, rightX, doc.y, { width: mm(72), align: "right" })
.text(company.website, rightX, doc.y, { width: mm(72), align: "right" });

doc.moveDown(0.8);
line(doc);
} catch {
// keep going
}

/* ---------- meta row ---------- */
doc.moveDown(0.6);
const metaY = doc.y;
const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - mm(6);

doc
.fontSize(10)
.fillColor("#475569")
.text(`Order ID: ${order.id}`, doc.page.margins.left, metaY, { width: colW })
.text(`Date: ${fmtLK(order.createdAt)}`, doc.page.margins.left, doc.y, { width: colW });

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
line(doc);

/* ---------- addresses ---------- */
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
line(doc);

/* ---------- items ---------- */
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

doc.fontSize(10).fillColor("#0f172a");
const rowGap = mm(7);

for (const it of order.items) {
const nextY = y + rowGap;
if (nextY > doc.page.height - doc.page.margins.bottom - mm(50)) {
doc.addPage();
y = doc.y = doc.page.margins.top;

// repeat header
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

/* ---------- totals ---------- */
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
totalRow(
`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`,
"-" + money(order.promoDiscount)
);
}
totalRow("Shipping", order.freeShipping ? "Free" : money(order.shipping));
totalRow("Grand Total", money(order.total), true);

/* ---------- notes ---------- */
if (order.customer.notes) {
doc.moveDown(0.8);
line(doc);
doc.moveDown(0.4);
doc.fontSize(11).fillColor("#0f172a").text("Notes");
doc.fontSize(10).fillColor("#334155").text(order.customer.notes, {
width: col.right - doc.page.margins.left,
});
}

/* ---------- footer ---------- */
doc.moveDown(1);
line(doc);
const footer = `© ${new Date().getFullYear()} ${company.brand} — All rights reserved.`;
doc
.fontSize(9)
.fillColor("#64748b")
.text(footer, doc.page.margins.left, doc.y + mm(2), {
width: col.right - doc.page.margins.left,
align: "center",
});

doc.end();
return result;
}

/* -------------------------------- helpers ------------------------------- */

function line(doc: any) {
const L = doc.page.margins.left;
const R = doc.page.width - doc.page.margins.right;
doc.strokeColor("#e5e7eb").moveTo(L, doc.y).lineTo(R, doc.y).stroke();
}
