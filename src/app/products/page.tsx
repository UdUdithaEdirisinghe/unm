export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------- search helpers (typo-tolerant, safe) ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Small Levenshtein distance for fuzzy matching
function editDistance(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // delete
        dp[i][j - 1] + 1,      // insert
        dp[i - 1][j - 1] + cost // replace
      );
    }
  }
  return dp[m][n];
}

function fuzzyIncludes(hay: string, needle: string): boolean {
  if (!needle) return true;
  if (hay.includes(needle)) return true;

  // quick tokenization of hay to keep checks bounded
  const words = hay.split(/\s+|[-_/]/).filter(Boolean).slice(0, 80);
  const lenN = needle.length;

  // avoid noise for tiny tokens
  if (lenN <= 2) return false;

  // allow small typos based on length
  const maxEd =
    lenN <= 3 ? 0 :
    lenN <= 6 ? 1 :
    lenN <= 10 ? 2 : Math.floor(lenN * 0.3);

  for (const w of words) {
    // cheap heuristic to skip obviously different words
    if (lenN >= 4 && w.length >= 4) {
      if (w[0] !== needle[0] && w[w.length - 1] !== needle[needle.length - 1]) continue;
    }
    const ed = editDistance(w, needle);
    const ratio = 1 - ed / Math.max(w.length, lenN);
    if (ed <= maxEd || ratio >= 0.7) return true;
  }
  return false;
}

function matches(product: Product, q: string) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
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
    .map((s) => s.slice(0, 5000)); // safety ceiling

  return tokens.every((t) => {
    const wordBoundaryRe = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
    return haystacks.some((h) => wordBoundaryRe.test(h) || fuzzyIncludes(h, t));
  });
}

/* ---------- sort helpers (unchanged) ---------- */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1; // in-stock first

  const aSale =
    typeof a.salePrice === "number" &&
    a.salePrice > 0 &&
    a.salePrice < a.price;
  const bSale =
    typeof b.salePrice === "number" &&
    b.salePrice > 0 &&
    b.salePrice < b.price;
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
  const explicit = String(
    ((p as any).category || (p as any).type || "")
  ).trim();
  if (explicit) return normalizeCategoryName(explicit);

  const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")]
    .join(" ")
    .toLowerCase();
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

  // Pass-through to your existing client component & UI
  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={cat || undefined}
    />
  );
}