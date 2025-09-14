// src/components/ProductsClient.tsx
"use client";

import { useMemo, useState } from "react";
import type { Product } from "../lib/products";
import ProductCard from "./ProductCard";
import SearchBar from "./SearchBar";

/* ---------- helpers ---------- */
function prettyLabel(slug: string) {
  return (slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function headlineFor(slug?: string) {
  if (!slug) return "Browse Our Collection";
  const label = prettyLabel(slug);

  const nicer: Record<string, string> = {
    "power-banks": "Power Banks",
    chargers: "Chargers & Adapters",
    cables: "Cables",
    bags: "Bags & Sleeves",
    audio: "Audio",
  };
  const display = nicer[slug] ?? label;

  return `Best prices on ${display} in Sri Lanka`;
}

export default function ProductsClient({
  products,
  initialQuery,
  initialCat,
}: {
  products: Product[];
  initialQuery: string;
  initialCat?: string; // slug (e.g., "power-banks")
}) {
  const [visibleCount, setVisibleCount] = useState(12);

  const visible = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );
  const hasMore = visibleCount < products.length;

  const title = headlineFor(initialCat);

  return (
    <div className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-x1 font-semibold text-white">{title}</h1>
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

      {/* No results message */}
      {products.length === 0 && (
        <p className="text-slate-400">
          {initialQuery
            ? `No matches for “${initialQuery}”.`
            : "No products found in this category."}
        </p>
      )}
    </div>
  );
}