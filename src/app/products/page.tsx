// src/app/products/page.tsx
"use client";

import { useState, useMemo } from "react";
import ProductCard from "../../components/ProductCard";
import SearchBar from "../../components/SearchBar";
import { getProducts } from "../../lib/products";
import type { Product } from "../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- search helpers ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(product: Product, q: string) {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

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

/* ---------- sort helpers ---------- */
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

/* ---------- Page ---------- */
type PageProps = { searchParams?: { q?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();
  const q = (searchParams?.q ?? "").trim();

  const filtered = (q ? all.filter((p) => matches(p, q)) : all).slice();
  filtered.sort(sortProducts);

  return <ProductsClient products={filtered} initialQuery={q} />;
}

/* ---------- Client component for "Load more" ---------- */
function ProductsClient({ products, initialQuery }: { products: Product[]; initialQuery: string }) {
  const [visibleCount, setVisibleCount] = useState(12);

  const visible = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const hasMore = visibleCount < products.length;

  return (
    <div className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-white">Products</h1>
        <SearchBar
          initial={initialQuery}
          placeholder="Search products…"
          className="w-full sm:max-w-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            className="btn-primary px-6 py-2"
            onClick={() => setVisibleCount((c) => c + 12)}
          >
            Load more
          </button>
        </div>
      )}

      {initialQuery && products.length === 0 && (
        <p className="text-slate-400">No matches for “{initialQuery}”.</p>
      )}
    </div>
  );
}