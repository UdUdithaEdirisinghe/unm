// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------- tiny utils ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------- fuzzy helpers (Levenshtein) ---------- */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[a.length][b.length];
}

function fuzzyIncludes(hay: string, needle: string): boolean {
  // exact / substring match quickly
  if (hay.includes(needle)) return true;

  // If the needle is short, allow distance 1; medium 2; long 3.
  const n = needle.length;
  const maxDist = n <= 4 ? 1 : n <= 7 ? 2 : 3;

  // Slide a window across the haystack (bounded for perf)
  const len = Math.min(Math.max(needle.length + 2, needle.length + 6), Math.max(needle.length + 6, hay.length));
  for (let i = 0; i + needle.length <= hay.length && i < 200; i++) {
    const seg = hay.slice(i, Math.min(i + len, hay.length));
    if (levenshtein(seg, needle) <= maxDist) return true;
  }
  return false;
}

/* ---------- synonyms / normalization ---------- */
const SYNONYMS: Record<string, string[]> = {
  "power bank": ["powerbank", "power-bank", "pwerbank", "power bnk"],
  charger: ["adaptor", "adapter", "wall charger", "gan"],
  cable: ["usb-c", "type c", "lightning", "micro usb", "usb a", "usb"],
  audio: ["earbud", "earbuds", "headphone", "headset", "speaker"],
};

function expandTokens(tokens: string[]) {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    for (const [key, alts] of Object.entries(SYNONYMS)) {
      if (t === key || alts.includes(t)) {
        out.add(key);
        alts.forEach((a) => out.add(a));
      }
    }
  }
  return Array.from(out);
}

/* ---------- matching ---------- */
function matches(product: Product, q: string) {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const haystacks: string[] = [
    product.name ?? "",
    product.brand ?? "",
    (product as any).category ?? "",
    Array.isArray(product.specs)
      ? (product.specs as unknown as string[]).join(" ")
      : Object.values(product.specs ?? {}).join(" "),
  ]
    .map((s) => String(s).toLowerCase())
    .filter(Boolean);

  const expanded = expandTokens(tokens);

  // Each token (or its synonym) should appear in at least one field, allowing fuzzy typos.
  return expanded.every((t) => {
    const wordBoundary = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
    return haystacks.some((h) => wordBoundary.test(h) || fuzzyIncludes(h, t));
  });
}

/* ---------- sort helpers (unchanged) ---------- */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1; // in-stock first

  const aSale = typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
  const bSale = typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
  if (aSale !== bSale) return aSale ? -1 : 1; // sale first

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return bCreated - aCreated; // newest first

  return a.name.localeCompare(b.name); // stable fallback
}

/* ---------- category helpers (unchanged) ---------- */
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
type PageProps = { searchParams?: { q?: string; cat?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  const q = (searchParams?.q ?? "").trim();
  const cat = (searchParams?.cat ?? "").trim().toLowerCase();

  let filtered = all;

  if (q) {
    filtered = filtered.filter((p) => matches(p, q));
  }

  if (cat) {
    filtered = filtered.filter((p) => inferCategory(p) === cat);
  }

  filtered = filtered.slice().sort(sortProducts);

  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={cat || undefined}
    />
  );
}