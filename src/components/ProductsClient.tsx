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
  if (!slug) return "Browse the Best Tech Deals in Sri Lanka";
  const label = prettyLabel(slug);

  // Map a few known categories to nicer public-facing labels
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

function subtitleFor(slug?: string) {
  if (!slug) return "Everything you need — curated, in-stock, and ready to ship.";
  switch (slug) {
    case "power-banks":
      return "Stay powered up, anywhere.";
    case "chargers":
      return "Fast, safe charging for every device.";
    case "cables":
      return "Durable, high-speed connectivity.";
    case "bags":
      return "Protective sleeves and carry solutions.";
    case "audio":
      return "Crisp sound. Clear calls. Everyday comfort.";
    default:
      return "Quality accessories at honest prices.";
  }
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
  // show 12 initially; click adds 12 more
  const [visibleCount, setVisibleCount] = useState(12);

  const visible = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );
  const hasMore = visibleCount < products.length;

  const title = headlineFor(initialCat);
  const baseSubtitle = subtitleFor(initialCat);
  const subtitle =
    initialQuery?.trim()
      ? `${baseSubtitle} (filtered by “${initialQuery.trim()}”).`
      : baseSubtitle;

  return (
    <div className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
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