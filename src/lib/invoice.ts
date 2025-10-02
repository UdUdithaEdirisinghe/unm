// src/lib/invoice.ts
/**
 * Old-school, stamp-ready invoice PDF (no font files).
 * - ASCII-only: fixes stray "?" from smart quotes & dashes.
 * - Admin PDF: keeps signature/seal + warranty panel; NO “computer-generated” note.
 * - Customer PDF: NO signature; warranty panel; subtle “computer-generated” note above footer.
 * - Robust item-name wrapping with dynamic row height.
 * - **NEW**: Multi-page support with safe page breaks (no overlapping).
 * - **NEW**: Page numbers ("Page X of Y") on every page (bottom-right).
 */

import type { OrderEmail } from "./mail";

type InvoiceOptions = {
  variant?: "admin" | "customer";
  warrantyLines?: string[] | null;
};

const BRAND = {
  name: "Manny.lk",
  address: "35/24, Udaperadeniya, Peradeniya",
  phone: "+94 76 070 3523",
  email: "info@manny.lk",
  web: "www.manny.lk",
};

const A4 = { w: 595.28, h: 841.89 }; // pt
const MARGIN = 42;

const FONT = {
  body: "F1",
  size: { title: 22, normal: 11, small: 9 },
  avgChar(size: number) {
    return size * 0.48; // ~Helvetica average
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

/** Map smart punctuation to ASCII; drop unknown glyphs (prevents “?”). */
function asciiClean(s: string) {
  const map: Record<string, string> = {
    "–": "-", "—": "-", "−": "-",
    "“": '"', "”": '"',
    "‘": "'", "’": "'",
    "•": "*", "…": "...",
    "™": "", "®": "", "©": "",
    "\u00A0": " ",
  };
  return (s || "")
    .split("")
    .map((ch) => map[ch] ?? (ch >= " " && ch <= "~" ? ch : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
function esc(s: string) {
  return asciiClean(s)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
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
function assembleMulti(pageBodies: string[]): Buffer {
  // Object numbering plan:
  // 1: Catalog
  // 2: Pages
  // 3: Font (Helvetica)
  // For each page i (0-based):
  //   Pg = nextId, Ct = nextId+1
  //   Page references Ct and shared Font
  const objs: string[] = [];
  const N = Math.max(1, pageBodies.length);

  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];
  let nextId = 4; // after 1,2,3 (Catalog, Pages, Font)

  for (let i = 0; i < N; i++) {
    pageObjIds[i] = nextId++;
    contentObjIds[i] = nextId++;
  }

  const catalog = `<< /Type /Catalog /Pages 2 0 R >>\n`;
  const pagesNode = `<< /Type /Pages /Kids [${pageObjIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${N} >>\n`;
  const font = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n`;

  objs[0] = catalog; // 1
  objs[1] = pagesNode; // 2
  objs[2] = font; // 3

  // Insert per-page objects
  for (let i = 0; i < N; i++) {
    const pgId = pageObjIds[i];
    const ctId = contentObjIds[i];
    const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${ctId} 0 R >>\n`;
    const contentObj = stream(pageBodies[i] || "");
    objs[pgId - 1] = pageObj;
    objs[ctId - 1] = contentObj;
  }

  // Assemble (like your original but variable object count)
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
  const words = asciiClean(text).split(/\s+/).filter(Boolean);
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
  const valueWidth = (asciiClean(value).length || 1) * FONT.avgChar(size);
  const vx = x + w - 10 - valueWidth;
  s += BT(x + 10, y, FONT.size.normal) + T(label) + ET;
  s += BT(Math.max(x + 10, vx), y, size) + T(value) + ET;
  return s;
}

/* -------------------------------- PDF -------------------------------- */

export async function createInvoicePdf(
  order: OrderEmail,
  brandName: string,
  opts?: InvoiceOptions
): Promise<Buffer> {
  const brand = { ...BRAND, name: brandName || BRAND.name };
  const variant = (opts?.variant ?? "admin") as "admin" | "customer";

  const left = MARGIN;
  const right = A4.w - MARGIN;
  const top = A4.h - MARGIN;
  const width = right - left;

  const lead = 14;
  const baseRowH = 20;

  // Multi-page: keep a list of per-page content bodies
  const pages: string[] = [];
  let body = "";
  let y = top;

  // Items-table geometry (reused on every page when header is drawn)
  const headH = 24;
  const descW = Math.round(width * 0.58);
  const qtyW = Math.round(width * 0.10);
  const priceW = Math.round(width * 0.14);
  const totalW = width - (descW + qtyW + priceW);
  const xDesc = left;
  const xQty = xDesc + descW;
  const xPrice = xQty + qtyW;
  const xTotal = xPrice + priceW;

  // Helpers to start/commit pages
  const commitPage = () => {
    pages.push(body);
    body = "";
  };

  const drawFirstPageHeader = () => {
    // Header
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

    const title = "INVOICE";
    const ts = FONT.size.title;
    const tw = title.length * FONT.avgChar(ts);
    const tx = titleX + (titleW - tw) / 2;
    const titleBaseline = y - headerH + headerH / 2 - ts * 0.32;
    body += BT(Math.max(titleX + 6, tx), titleBaseline, ts) + T(title) + ET;

    y -= headerH + 12;

    // Meta
    const metaH = 58;
    body += box(left, y - metaH, width, metaH);
    body += BT(left + 12, y - 18, FONT.size.normal) + TL(lead);
    body += T(`Order ID: ${asciiClean(order.id)}`) + TSTAR;
    body += T(`Date: ${fmtLK(order.createdAt)}`) + TSTAR;
    const pay =
      order.paymentMethod === "BANK"
        ? "Direct Bank Transfer"
        : order.paymentMethod === "COD"
        ? "Cash on Delivery"
        : asciiClean((order as any).paymentMethod || "Payment");
    body += T(`Payment: ${pay}`) + ET;
    y -= metaH + 12;

    // Billing & Shipping
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
      `${asciiClean(order.customer.firstName)} ${asciiClean(order.customer.lastName)}`.trim(),
      ...wrapToWidth(
        `${asciiClean(order.customer.address)}, ${asciiClean(order.customer.city)}${
          order.customer.postal ? " " + asciiClean(order.customer.postal) : ""
        }`,
        colW - pad * 2,
        FONT.size.normal
      ),
      ...(order.customer.phone ? [`Phone: ${asciiClean(order.customer.phone)}`] : []),
      `Email: ${asciiClean(order.customer.email)}`,
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
        asciiClean(s.name || `${order.customer.firstName} ${order.customer.lastName}`),
        ...wrapToWidth(
          `${asciiClean(s.address)}, ${asciiClean(s.city)}${s.postal ? " " + asciiClean(s.postal) : ""}`,
          colW - pad * 2,
          FONT.size.normal
        ),
        ...(s.phone ? [`Phone: ${asciiClean(s.phone)}`] : []),
      ];
      for (const ln of shipLines) {
        body += BT(shipX + pad, yy, FONT.size.normal) + T(ln) + ET;
        yy -= 14;
      }
    } else {
      body += BT(shipX + pad, yy, FONT.size.normal) + T("Same as billing") + ET;
    }

    y -= detailsH + 14;

    // Items table header
    drawItemsHeader();
  };

  const drawItemsHeader = () => {
    body += box(left, y - headH, width, headH);
    body += line(xQty, y - headH, xQty, y);
    body += line(xPrice, y - headH, xPrice, y);
    body += line(xTotal, y - headH, xTotal, y);
    body += BT(xDesc + 8, y - 16, FONT.size.normal) + T("Item") + ET;
    body += BT(xQty + 8, y - 16, FONT.size.normal) + T("Qty") + ET;
    body += BT(xPrice + 8, y - 16, FONT.size.normal) + T("Price") + ET;
    body += BT(xTotal + 8, y - 16, FONT.size.normal) + T("Total") + ET;
    y -= headH;
  };

  // Start first page
  drawFirstPageHeader();

  // ---------- Items (with page breaks) ----------
  const bottomGuard = MARGIN + 40; // hard bottom margin to avoid colliding with footer
  const needSpace = (h: number) => y - h < bottomGuard;

  for (const it of order.items) {
    const nameLines = wrapToWidth(
      asciiClean(String((it as any).name || "")),
      descW - 16,
      FONT.size.normal
    );
    const linesCount = Math.max(1, nameLines.length);
    const itemH = Math.max(baseRowH, 12 + linesCount * 14);

    // If not enough space for this item, open a new page with items header
    if (needSpace(itemH)) {
      commitPage();
      y = top;
      // On subsequent pages we only continue the items table
      drawItemsHeader();
    }

    body += box(left, y - itemH, width, itemH);
    body += line(xQty, y - itemH, xQty, y);
    body += line(xPrice, y - itemH, xPrice, y);
    body += line(xTotal, y - itemH, xTotal, y);

    let ny = y - 13;
    for (const ln of nameLines) {
      body += BT(xDesc + 8, ny, FONT.size.normal) + T(ln) + ET;
      ny -= 14;
    }

    body += BT(xQty + 8, y - 13, FONT.size.normal) + T(String((it as any).quantity)) + ET;
    body += BT(xPrice + 8, y - 13, FONT.size.normal) + T(money((it as any).price)) + ET;
    body +=
      BT(xTotal + 8, y - 13, FONT.size.normal) +
      T(money((it as any).price * (it as any).quantity)) +
      ET;

    y -= itemH;
  }

  y -= 12;

  // ---------- Totals ----------
  const hasDiscount = !!(order.promoDiscount && order.promoDiscount > 0);
  const totalsW = 280;
  const totalsX = right - totalsW;
  const totalsRowH = 20;
  const rows = 3 + (hasDiscount ? 1 : 0);
  const totalsH = rows * totalsRowH;

  // If totals block doesn't fit, move it to a new page
  if (needSpace(totalsH + 20)) {
    commitPage();
    y = top;
  }

  body += box(totalsX, y - totalsH, totalsW, totalsH);

  let ty = y - 14;
  body = totalsRow(body, totalsX, ty, totalsW, "Subtotal", money(order.subtotal));
  ty -= totalsRowH;
  if (hasDiscount) {
    const label = `Discount ${order.promoCode ? "(" + asciiClean(order.promoCode) + ")" : "(FD)"}`;
    body = totalsRow(body, totalsX, ty, totalsW, label, "-" + money(order.promoDiscount || 0));
    ty -= totalsRowH;
  }
  body = totalsRow(body, totalsX, ty, totalsW, "Shipping", order.freeShipping ? "Free" : money(order.shipping));
  ty -= totalsRowH;
  body = totalsRow(body, totalsX, ty, totalsW, "Grand Total", money(order.total), true);

  y -= totalsH + 16;

  // ---------- Warranty panel (optional) ----------
  const linesIn = (opts?.warrantyLines || []).map(asciiClean).filter(Boolean);
  if (linesIn.length) {
    const panelW = totalsW,
      panelX = totalsX;
    const maxTextW = panelW - 20;
    const wrapped: string[] = [];
    for (const w of linesIn) wrapped.push(...wrapToWidth(`• ${w}`, maxTextW, FONT.size.small));
    const use = wrapped.slice(0, 9);
    const panelH = 18 + use.length * 12 + 10;

    if (needSpace(panelH + 20)) {
      commitPage();
      y = top;
    }

    const panelTop = y - panelH;
    body += box(panelX, panelTop, panelW, panelH);
    let wy = y - 18;
    body += BT(panelX + 10, wy, FONT.size.normal) + T("Warranty") + ET;
    wy -= 12;
    for (const ln of use) {
      body += BT(panelX + 10, wy, FONT.size.small) + T(ln) + ET;
      wy -= 12;
    }
    y -= panelH + 14;
  }

  // ---------- Signature / System note ----------
  if (variant === "admin") {
    const sealW = totalsW,
      sealH = 110,
      sealX = totalsX;

    if (needSpace(sealH + 30)) {
      commitPage();
      y = top;
    }

    const sealTop = y - sealH;
    body += box(sealX, sealTop, sealW, sealH);
    const sigText = "Authorized Signature / Seal";
    const sigSize = FONT.size.normal;
    const sigWidth = sigText.length * FONT.avgChar(sigSize);
    const sigX = sealX + (sealW - sigWidth) / 2;
    const sigBaseline = sealTop + 16;
    body += BT(Math.max(sealX + 8, sigX), sigBaseline, sigSize) + T(sigText) + ET;
    y -= sealH + 20;
  } else {
    // Subtle footer-style line (no box) – on last page; move if needed
    const sysNote =
      "This is a computer-generated invoice. No physical signature is required.";
    const noteH = 12 + 10;

    if (needSpace(noteH + 30)) {
      commitPage();
      y = top;
    }

    const est = sysNote.length * FONT.avgChar(FONT.size.small);
    const sysX = left + (width - Math.min(est, width - 20)) / 2;
    const sysY = Math.max(MARGIN + 50, y - 16); // keep about the same vertical feeling
    body += BT(Math.max(left + 10, sysX), sysY, FONT.size.small) + T(sysNote) + ET;
  }

  // ---------- Footer (copyright) ----------
  const footer = `(c) ${new Date().getFullYear()} ${brand.name} - All rights reserved.`;
  const est = footer.length * FONT.avgChar(FONT.size.small);
  const fx = left + (width - est) / 2;
  const fy = MARGIN + 30;

  // If footer would collide, bump to new page bottom
  if (y - 20 < fy + 10) {
    commitPage();
    y = top;
  }
  body += BT(Math.max(left, fx), fy, FONT.size.small) + T(footer) + ET;

  // Commit last page
  commitPage();

  // ---------- Page numbers on every page ----------
  // Add "Page X of Y" at bottom-right, slightly above bottom margin.
  const totalPages = pages.length;
  const pageNumY = MARGIN + 16;
  const pageNumX = right - 100; // right-aligned-ish; the string width is small

  const pagesWithNumbers = pages.map((pg, i) => {
    const label = `Page ${i + 1} of ${totalPages}`;
    return (
      pg +
      BT(pageNumX, pageNumY, FONT.size.small) +
      T(label) +
      ET
    );
  });

  return assembleMulti(pagesWithNumbers);
}
