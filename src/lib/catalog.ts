// src/lib/catalog.ts
import type { Product } from "./products";

/** Safe string */
export const safeStr = (v: unknown) => String(v ?? "").trim();

/** Slugify fallback */
export function slugify(s: string) {
return safeStr(s)
.toLowerCase()
.normalize("NFKD")
.replace(/[^\w\s-]/g, "")
.replace(/\s+/g, "-");
}

/** Normalise any raw category label to a stable slug */
export function normalizeCategoryName(raw: string): string {
const s = safeStr(raw).toLowerCase();

if (/power\s*-?\s*bank/.test(s)) return "power-banks";
if (/(charger|adaptor|adapter|gan|wall\s*charger|car\s*charger)/.test(s)) return "chargers";
if (/(cable|usb|type\s*-?\s*c|lightning|micro\s*-?\s*usb)/.test(s)) return "cables";
if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

const fallback = slugify(raw);
return fallback || "others";
}

/** Prefer explicit field, otherwise infer from name/slug */
export function inferCategory(p: Product): string {
const explicit = safeStr((p as any).category || (p as any).type);
if (explicit) return normalizeCategoryName(explicit);

const hay = `${safeStr(p.name)} ${safeStr((p as any).slug)}`.toLowerCase();
return normalizeCategoryName(hay);
}

/** Exact (non-fuzzy) match across key fields */
export function matches(product: Product, q: string) {
const term = safeStr(q).toLowerCase();
if (!term) return true;

const hay = [
safeStr(product.name),
safeStr(product.brand),
safeStr((product as any).category ?? (product as any).type),
safeStr((product as any).slug),
]
.join(" ")
.toLowerCase();

return hay.includes(term);
}

/** Stable sort: in-stock → on-sale → newest → name */
export function sortProducts(a: Product, b: Product) {
const aIn = (a.stock ?? 0) > 0;
const bIn = (b.stock ?? 0) > 0;
if (aIn !== bIn) return aIn ? -1 : 1;

const aSale = typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
const bSale = typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
if (aSale !== bSale) return aSale ? -1 : 1;

const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
if (aTs !== bTs) return bTs - aTs;

return a.name.localeCompare(b.name);
}

/** Pretty labels for headings */
export const prettyCat: Record<string, string> = {
"power-banks": "Power Banks",
chargers: "Chargers & Adapters",
cables: "Cables",
bags: "Bags & Sleeves",
audio: "Audio",
others: "Tech Accessories",
};
