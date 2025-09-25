// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------- fuzzy helpers ---------- */
function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Levenshtein distance (for typos tolerance)
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // delete
        dp[i][j - 1] + 1, // insert
        dp[i - 1][j - 1] + cost // replace
      );
    }
  }
  return dp[a.length][b.length];
}

// Check if query matches product
function matches(product: Product, q: string): boolean {
  const tokens = normalize(q).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const fields = [
    normalize(product.name ?? ""),
    normalize(product.brand ?? ""),
    normalize((product as any).category ?? ""),
    Array.isArray(product.specs)
      ? normalize((product.specs as unknown as string[]).join(" "))
      : normalize(Object.values(product.specs ?? {}).join(" ")),
  ];

  return tokens.every((t) => {
    return fields.some((field) => {
      if (!field) return false;

      // ✅ Exact match inside field
      if (field.includes(t)) return true;

      // ✅ Allow fuzzy match (distance ≤ 2, but only for words of length ≥ 4)
      return field
        .split(/\s+/)
        .some((word) => word.length > 3 && levenshtein(t, word) <= 2);
    });
  });
}

/* ---------- sort helpers ---------- */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1;

  const aSale =
    typeof a.salePrice === "number" &&
    a.salePrice > 0 &&
    a.salePrice < a.price;
  const bSale =
    typeof b.salePrice === "number" &&
    b.salePrice > 0 &&
    b.salePrice < b.price;
  if (aSale !== bSale) return aSale ? -1 : 1;

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return bCreated - aCreated;

  return a.name.localeCompare(b.name);
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
  const s = normalize(raw);

  if (/power\s*bank/.test(s)) return "power-banks";
  if (/(charger|adapter|adaptor|gan|wall charger|car charger)/.test(s))
    return "chargers";
  if (/(cable|usb|type c|lightning|micro usb)/.test(s)) return "cables";
  if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
  if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

  return slugify(raw) || "others";
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

  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={cat || undefined}
    />
  );
}