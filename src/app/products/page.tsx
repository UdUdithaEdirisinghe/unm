// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ------------------------------------------------------------------ */
/* Category normalization (shared logic)                               */
/* ------------------------------------------------------------------ */
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Map any raw category label to a stable route slug */
export function normalizeCategoryName(raw: string): string {
  const s = (raw || "").trim().toLowerCase();

  if (/power\s*-?\s*bank/.test(s)) return "power-banks";
  if (/(charger|adaptor|adapter|gan|wall\s*charger|car\s*charger)/.test(s)) return "chargers";
  if (/(cable|usb|type\s*-?\s*c|lightning|micro\s*-?\s*usb)/.test(s)) return "cables";
  if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
  if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

  // fallback: slugify anything unknown so URLs are stable
  const fallback = slugify(raw);
  return fallback || "others";
}

/** Prefer explicit category field; then infer from name/slug */
export function inferCategory(p: Product): string {
  const explicit = String(((p as any).category || (p as any).type || "")).trim();
  if (explicit) return normalizeCategoryName(explicit);

  const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")]
    .join(" ")
    .toLowerCase();
  return normalizeCategoryName(hay);
}

/* ------------------------ Exact search helpers ------------------------ */
function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}
function matches(product: Product, q: string) {
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

  // exact substring (no fuzzy)
  return hay.includes(term);
}

/* ------------------------------ sorting ------------------------------ */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1;

  const aSale = typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
  const bSale = typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
  if (aSale !== bSale) return aSale ? -1 : 1;

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return bCreated - aCreated;

  return a.name.localeCompare(b.name);
}

/* -------------------------------- page -------------------------------- */
type PageProps = { searchParams?: { q?: string; cat?: string; brand?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  const q = safeStr(searchParams?.q ?? "");

  // Only normalize category if provided
  const rawCat = safeStr(searchParams?.cat ?? "");
  const catSlug = rawCat ? normalizeCategoryName(rawCat) : "";

  const brand = safeStr(searchParams?.brand ?? "").toLowerCase();

  let filtered = all.slice();

  // ❌ removed server-side text filter so Fuse.js in ProductsClient can handle fuzzy search
  // if (q) filtered = filtered.filter((p) => matches(p, q));

  if (catSlug) {
    filtered = filtered.filter((p) => {
      const inferred = inferCategory(p); // normalized
      const raw = normalizeCategoryName(safeStr((p as any).category));
      return inferred === catSlug || raw === catSlug;
    });
  }

  if (brand) {
    filtered = filtered.filter((p) => safeStr(p.brand).toLowerCase() === brand);
  }

  filtered.sort(sortProducts);

  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={catSlug || undefined}
      initialBrand={brand || undefined}
    />
  );
}