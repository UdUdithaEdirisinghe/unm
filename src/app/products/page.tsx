// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------------------- small utils ---------------------- */
const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (s: string) => norm(s).split(" ").filter(Boolean);

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // del
        dp[i][j - 1] + 1,      // ins
        dp[i - 1][j - 1] + cost // sub
      );
    }
  }
  return dp[m][n];
}

/* ---------------- synonyms / category helpers ------------- */
function slugify(s: string) {
  return norm(s).replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

function normalizeCategoryName(raw: string): string {
  const s = norm(raw);

  if (/power\s*-?\s*bank/.test(s)) return "power-banks";
  if (/(charger|adaptor|adapter|gan|wall\s*charger|car\s*charger)/.test(s))
    return "chargers";
  if (/(cable|usb|type\s*-?\s*c|lightning|micro\s*-?\s*usb)/.test(s))
    return "cables";
  if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
  if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

  const fallback = slugify(raw);
  return fallback || "others";
}

function inferCategory(p: Product): string {
  const explicit = String(((p as any).category || (p as any).type || "")).trim();
  if (explicit) return normalizeCategoryName(explicit);

  const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")]
    .join(" ")
    .toLowerCase();
  return normalizeCategoryName(hay);
}

/* ------------------ scoring (fuzzy + weighted) ------------- */
/**
 * Score a single token against a field string.
 * 1.0 = exact word; 0.8 = prefix; 0.6 = substring; ~0.65–0.75 = fuzzy (<=1 edit)
 */
function tokenScoreForField(token: string, field: string): number {
  if (!token || !field) return 0;
  const f = norm(field);
  const words = f.split(" ");

  // exact word
  if (words.includes(token)) return 1;

  // prefix
  if (words.some((w) => w.startsWith(token))) return 0.8;

  // substring
  if (f.includes(token)) return 0.6;

  // fuzzy: allow one edit for tokens length >= 4
  if (token.length >= 4) {
    for (const w of words) {
      if (Math.abs(w.length - token.length) > 1) continue;
      if (levenshtein(token, w) <= 1) {
        // scale slightly with closeness
        const d = levenshtein(token, w);
        return 0.75 - d * 0.1; // 0.75 (best) down to 0.65
      }
    }
  }

  return 0;
}

type FieldSet = {
  name: string;
  brand: string;
  category: string;
  specs: string;
};

function getFields(p: Product): FieldSet {
  const specs =
    Array.isArray(p.specs)
      ? (p.specs as unknown as string[]).join(" ")
      : typeof p.specs === "object" && p.specs
      ? Object.values(p.specs).join(" ")
      : String(p.specs ?? "");
  return {
    name: p.name ?? "",
    brand: (p.brand as any) ?? "",
    category: ((p as any).category ?? "") as string,
    specs,
  };
}

/**
 * Compute a relevance score for the whole query against a product.
 * Heavily weight name/brand/category; specs are light to avoid noisy matches.
 * Also require a primary-field hit for very short queries.
 */
function scoreProduct(p: Product, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 1;

  const f = getFields(p);

  // Weights
  const W_NAME = 1.0;
  const W_BRAND = 0.8;
  const W_CAT = 0.9;
  const W_SPECS = 0.3;

  // For each token, take the best score across fields, then average.
  let sum = 0;
  let primaryHit = false;

  for (const t of tokens) {
    const sName = tokenScoreForField(t, f.name) * W_NAME;
    const sBrand = tokenScoreForField(t, f.brand) * W_BRAND;
    const sCat = tokenScoreForField(t, f.category) * W_CAT;
    const sSpecs = tokenScoreForField(t, f.specs) * W_SPECS;

    const best = Math.max(sName, sBrand, sCat, sSpecs);
    sum += best;

    if (Math.max(sName, sBrand, sCat) >= 0.6) primaryHit = true;
  }

  const avg = sum / tokens.length;

  // Short queries must match a primary field (name/brand/category).
  if (tokens.length === 1 && !primaryHit) return 0;

  return avg;
}

function isRelevant(p: Product, q: string): boolean {
  const tokens = tokenize(q);
  if (tokens.length === 0) return true;

  // Dynamic threshold: shorter queries need stronger match.
  const threshold = tokens.length === 1 ? 0.62 : 0.55;

  return scoreProduct(p, q) >= threshold;
}

/* ----------------------- sorting --------------------------- */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1; // in-stock first

  const aSale =
    typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
  const bSale =
    typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
  if (aSale !== bSale) return aSale ? -1 : 1; // sale first

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return bCreated - aCreated; // newest first

  return a.name.localeCompare(b.name); // stable fallback
}

/* ------------------------ page ----------------------------- */
type PageProps = { searchParams?: { q?: string; cat?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  const q = (searchParams?.q ?? "").trim();
  const cat = (searchParams?.cat ?? "").trim().toLowerCase();

  let filtered = all;

  if (q) {
    // include only relevant products by weighted fuzzy score
    filtered = filtered.filter((p) => isRelevant(p, q));
    // sort the result set by both relevance and our usual business rules
    filtered = filtered
      .map((p) => ({ p, s: scoreProduct(p, q) }))
      .sort((a, b) => b.s - a.s) // higher score first
      .map(({ p }) => p);
  }

  if (cat) {
    filtered = filtered.filter((p) => inferCategory(p) === cat);
  }

  // Final stable business sorting inside equivalence groups
  filtered = filtered.slice().sort(sortProducts);

  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={cat || undefined}
    />
  );
}