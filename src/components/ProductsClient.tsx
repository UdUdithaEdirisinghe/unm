"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Product } from "../lib/products";
import SearchBar from "./SearchBar";
import ProductCard from "./ProductCard";
import {
  normalizeCategoryName,
  inferCategory,
  safeStr,
  sortProducts,
  prettyCat,
} from "../lib/catalog";

type Props = {
  products: Product[];
  initialQuery?: string;
  initialCat?: string;   // normalised slug (e.g. "power-banks")
  initialBrand?: string; // lowercased brand
};

export default function ProductsClient({
  products,
  initialQuery = "",
  initialCat,
  initialBrand,
}: Props) {
  const base: Product[] = Array.isArray(products) ? products : [];

  // UI State
  const [q, setQ] = useState<string>(initialQuery);
  const [open, setOpen] = useState<boolean>(false);
  const [cat, setCat] = useState<string>(initialCat ?? "");
  const [brand, setBrand] = useState<string>(initialBrand ?? "");
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [stockOnly, setStockOnly] = useState<boolean>(false);

  // Sync with URL changes
  useEffect(() => {
    setQ(initialQuery);
    setCat(initialCat ?? "");
    setBrand(initialBrand ?? "");
  }, [initialQuery, initialCat, initialBrand]);

  // Facets
  const facets = useMemo(() => {
    const catSet = new Set<string>();
    const brandSet = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const p of base) {
      catSet.add(inferCategory(p)); // normalised
      const b = safeStr(p.brand);
      if (b) brandSet.add(b);

      const eff =
        typeof p.salePrice === "number" && p.salePrice > 0 && p.salePrice < p.price
          ? (p.salePrice as number)
          : p.price;
      if (Number.isFinite(eff)) {
        min = Math.min(min, eff);
        max = Math.max(max, eff);
      }
    }
    if (!Number.isFinite(min)) min = 0;

    return {
      cats: Array.from(catSet).sort(),
      brands: Array.from(brandSet).sort(),
      minPrice: min,
      maxPrice: max,
    };
  }, [base]);

  // Filtered list
  const filtered = useMemo(() => {
    let out = base.slice();

    if (q) {
      const term = safeStr(q).toLowerCase();
      out = out.filter((p) => {
        const hay = [
          safeStr(p.name),
          safeStr(p.brand),
          safeStr((p as any).category ?? (p as any).type),
          safeStr((p as any).slug),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }

    if (cat) {
      out = out.filter((p) => {
        const inferred = inferCategory(p);
        const raw = normalizeCategoryName(safeStr((p as any).category));
        return inferred === cat || raw === cat;
      });
    }

    if (brand) {
      const b = brand.toLowerCase();
      out = out.filter((p) => safeStr(p.brand).toLowerCase() === b);
    }

    if (priceMin !== "" || priceMax !== "") {
      out = out.filter((p) => {
        const eff =
          typeof p.salePrice === "number" && p.salePrice > 0 && p.salePrice < p.price
            ? (p.salePrice as number)
            : p.price;
        if (priceMin !== "" && eff < Number(priceMin)) return false;
        if (priceMax !== "" && eff > Number(priceMax)) return false;
        return true;
      });
    }

    if (stockOnly) out = out.filter((p) => (p.stock ?? 0) > 0);

    out.sort(sortProducts);
    return out;
  }, [base, q, cat, brand, priceMin, priceMax, stockOnly]);

  const clearAll = useCallback(() => {
    setQ("");
    setCat("");
    setBrand("");
    setPriceMin("");
    setPriceMax("");
    setStockOnly(false);
  }, []);

  const title =
    cat && prettyCat[cat]
      ? `Best prices on ${prettyCat[cat]} in Sri Lanka`
      : "Best prices on Tech Accessories in Sri Lanka";

  return (
    <div className="site-container py-6 space-y-4">
      {/* Title + actions (Search on RIGHT, palette unchanged) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-white">{title}</h1>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <SearchBar
            initial={q}
            placeholder="Search products…"
            className="w-full sm:w-[420px]"
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="filters-panel"
          >
            {open ? "Hide filters" : "Show filters"}
          </button>
        </div>
      </div>

      {/* Filters dropdown */}
      {open && (
        <section
          id="filters-panel"
          className="rounded-xl border border-slate-800 bg-[#0b1220] p-4"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm text-slate-300">
              Category
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="select mt-1 w-full"
              >
                <option value="">All</option>
                {facets.cats.map((c) => (
                  <option key={c} value={c}>
                    {prettyCat[c] ?? c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-300">
              Brand
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="select mt-1 w-full"
              >
                <option value="">All</option>
                {facets.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="text-sm text-slate-300">Price (LKR)</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={priceMin === "" ? "" : String(priceMin)}
                  onChange={(e) =>
                    setPriceMin(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input"
                  placeholder={`Min${facets.minPrice ? ` ≥ ${facets.minPrice}` : ""}`}
                />
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={priceMax === "" ? "" : String(priceMax)}
                  onChange={(e) =>
                    setPriceMax(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input"
                  placeholder={`Max${facets.maxPrice ? ` ≤ ${facets.maxPrice}` : ""}`}
                />
              </div>
            </div>

            <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(e) => setStockOnly(e.target.checked)}
              />
              In stock only
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary" onClick={() => setOpen(false)}>
              Apply
            </button>
            <button type="button" className="btn-ghost" onClick={clearAll}>
              Clear
            </button>
          </div>
        </section>
      )}

      {/* Grid – stretch items so all ProductCard heights align, no style changes */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-6 text-slate-300">
          No products match your filters.
        </div>
      ) : (
        <ul className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.id} className="h-full">
              <div className="h-full">
                <ProductCard product={p} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}