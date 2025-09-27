// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------- utils (same as before) ---------- */
function norm(s: string) {
return (s || "")
.toLowerCase()
.normalize("NFKD")
.replace(/[^\w\s-]/g, "")
.trim();
}
const compact = (s: string) => norm(s).replace(/[\s\-_/\.]/g, "");

function levenshtein(a: string, b: string): number {
const m = a.length,
n = b.length;
if (m === 0) return n;
if (n === 0) return m;
const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
for (let i = 0; i <= m; i++) dp[i][0] = i;
for (let j = 0; j <= n; j++) dp[0][j] = j;
for (let i = 1; i <= m; i++) {
for (let j = 1; j <= n; j++) {
const cost = a[i - 1] === b[j - 1] ? 0 : 1;
dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
}
}
return dp[m][n];
}

function scoreTokenAgainstField(token: string, field: string): number {
if (!token || !field) return 0;

const f = norm(field);
const words = f.split(" ").filter(Boolean);

const t = norm(token);
const fC = compact(f);
const tC = compact(t);

if (words.includes(t)) return 1.0;
if (words.some((w) => w.startsWith(t))) return 0.8;
if (f.includes(t)) return 0.6;
if (fC.includes(tC)) return 0.7;
if (fC.startsWith(tC)) return 0.78;

if (t.length >= 4) {
for (const w of words) {
if (Math.abs(w.length - t.length) > 1) continue;
const d = levenshtein(t, w);
if (d <= 1) return 0.72 - d * 0.1;
}
if (Math.abs(fC.length - tC.length) <= 1) {
const d2 = levenshtein(tC, fC);
if (d2 <= 1) return 0.7 - d2 * 0.08;
}
}
return 0;
}

function matches(product: Product, q: string) {
const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
if (tokens.length === 0) return true;

const haystacks: string[] = [
product.name ?? "",
product.brand ?? "",
(product as any).category ?? (product as any).type ?? "",
(product as any).slug ?? "",
].map((s) => String(s));

return tokens.every((t) => haystacks.some((h) => scoreTokenAgainstField(t, h) > 0.55));
}

/* ---------- category helpers ---------- */
function slugify(s: string) {
return (s || "")
.toLowerCase()
.normalize("NFKD")
.replace(/[^\w\s-]/g, "")
.trim()
.replace(/\s+/g, "-");
}

function normalizeCategoryName(raw: string): string {
const s = (raw || "").trim().toLowerCase();

if (/power\s*-?\s*bank/.test(s)) return "power-banks";
if (/(charger|adaptor|adapter|gan|wall\s*charger|car\s*charger)/.test(s)) return "chargers";
if (/(cable|usb|type\s*-?\s*c|lightning|micro\s*-?\s*usb)/.test(s)) return "cables";
if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

const fallback = slugify(raw);
return fallback || "others";
}

function inferCategory(p: Product): string {
const explicit = String(((p as any).category || (p as any).type || "")).trim();
if (explicit) return normalizeCategoryName(explicit);
const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")].join(" ").toLowerCase();
return normalizeCategoryName(hay);
}

/* ---------- page ---------- */
type PageProps = {
searchParams?: {
q?: string;
cat?: string;
brand?: string;
min?: string;
max?: string;
stock?: string; // "in"
sort?: string; // "popular" | "new" | "price-asc" | "price-desc"
};
};

export default async function ProductsPage({ searchParams }: PageProps) {
const all = await getProducts();

const q = (searchParams?.q ?? "").trim();
const cat = (searchParams?.cat ?? "").trim().toLowerCase();

let filtered = all;
if (q) filtered = filtered.filter((p) => matches(p, q));
if (cat) filtered = filtered.filter((p) => inferCategory(p) === cat);

// initial sort for SSR
filtered = filtered.slice().sort((a, b) => {
const aIn = (a.stock ?? 0) > 0;
const bIn = (b.stock ?? 0) > 0;
if (aIn !== bIn) return aIn ? -1 : 1;
const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
if (aCreated !== bCreated) return bCreated - aCreated;
return a.name.localeCompare(b.name);
});

return (
<ProductsClient
products={filtered}
initialQuery={q || undefined}
initialCat={cat || undefined}
// the rest are optional; allow undefined to avoid TS “string | undefined” issues
initialBrand={searchParams?.brand}
initialMin={searchParams?.min}
initialMax={searchParams?.max}
initialStock={searchParams?.stock === "in"}
initialSort={searchParams?.sort}
/>
);
}
