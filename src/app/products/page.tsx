// src/app/products/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts } from "../../lib/products";
import type { Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------- search helpers (server) ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(product: Product, q: string) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystacks: string[] = [
    product.name ?? "",
    product.brand ?? "",
    (product as any).category ?? "",
    Array.isArray(product.specs)
      ? (product.specs as unknown as string[]).join(" ")
      : Object.values(product.specs ?? {}).join(" "),
  ].map((s) => String(s).toLowerCase());

  return tokens.every((t) => {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
    return haystacks.some((h) => re.test(h));
  });
}

/* ---------- sort helpers (server) ---------- */
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

type PageProps = { searchParams?: { q?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  const q = (searchParams?.q ?? "").trim();
  const filtered = (q ? all.filter((p) => matches(p, q)) : all).slice();

  filtered.sort(sortProducts);

  // hand off to client component for "Load more"
  return <ProductsClient products={filtered} initialQuery={q} />;
}