"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Product } from "../lib/products";
import SearchBar from "./SearchBar";
import ProductCard from "./ProductCard";
import Fuse from "fuse.js";

/* ------------------------------ Types ------------------------------ */
type Props = {
  products: Product[];
  initialQuery?: string;
  initialCat?: string;   // normalised slug (e.g., "power-banks")
  initialBrand?: string; // lowercased brand
};

/* ------------------------------ Local utils ------------------------------ */
function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

// local helpers (don’t import from server to avoid hydration drift)
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
  const explicit = safeStr((p as any).category || (p as any).type);
  if (explicit) return normalizeCategoryName(explicit);
  const hay = [safeStr(p?.name), safeStr((p as any).slug)]
    .join(" ")
    .toLowerCase();
  return normalizeCategoryName(hay);
}

// compact form used for fuzzy matching (removes spaces/dashes/underscores/dots)
function compactStr(s: string): string {
  return safeStr(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s\-_.\/\\]/g, "");
}

/* ----------------------------- Component --------------------------- */
export default function ProductsClient({
  products,
  initialQuery = "",
  initialCat,
  initialBrand,
}: Props) {
  const base: Product[] = Array.isArray(products) ? products : [];

  // UI state
  const [q, setQ] = useState<string>(initialQuery);
  const [open, setOpen] = useState<boolean>(false);
  const [cat, setCat] = useState<string>(initialCat ?? "");
  const [brand, setBrand] = useState<string>(initialBrand ?? "");
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [stockOnly, setStockOnly] = useState<boolean>(false);

  // keep in sync with URL-provided values
  useEffect(() => {
    setQ(initialQuery);
    setCat(initialCat ?? "");
    setBrand(initialBrand ?? "");
  }, [initialQuery, initialCat, initialBrand]);

  /* ------------------------------ Facets ------------------------------ */
  const facets = useMemo(() => {
    const catSet = new Set<string>();
    const brandSet = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const p of base) {
      catSet.add(inferCategory(p));
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

  /* ------------------------------ Fuse index ------------------------------ */
  type Indexed = {
    ref: Product;
    name: string;
    nameCompact: string;
    brand: string;
    brandCompact: string;
    category: string;       // normalized slug (“power-banks”)
    categoryCompact: string;
    slug: string;
    slugCompact: string;
  };

  const fuse = useMemo(() => {
    // Build a searchable array with extra “compact” fields
    const indexed: Indexed[] = base.map((p) => {
      const brand = safeStr(p.brand);
      const rawCat = safeStr((p as any).category || (p as any).type);
      const catNorm = normalizeCategoryName(rawCat);
      return {
        ref: p,
        name: safeStr(p.name),
        nameCompact: compactStr(p.name),
        brand,
        brandCompact: compactStr(brand),
        category: catNorm,
        categoryCompact: compactStr(catNorm),
        slug: safeStr((p as any).slug),
        slugCompact: compactStr(safeStr((p as any).slug)),
      };
    });

    return new Fuse(indexed, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "brand", weight: 0.25 },
        { name: "category", weight: 0.2 },
        { name: "slug", weight: 0.05 },
        // compact fields for “powerbank”/typos/no-space
        { name: "nameCompact", weight: 0.5 },
        { name: "brandCompact", weight: 0.25 },
        { name: "categoryCompact", weight: 0.2 },
        { name: "slugCompact", weight: 0.05 },
      ],
      threshold: 0.38,          // typo tolerant but not too loose
      distance: 120,
      ignoreLocation: true,     // allow match anywhere in string
      minMatchCharLength: 2,
      useExtendedSearch: false,
    });
  }, [base]);

  /* ------------------------------ Filter + sort ------------------------------ */
  const filtered = useMemo(() => {
    let out = base.slice();

    // 🔍 fuzzy search: try both raw term and compact term, then merge
    if (q) {
      const raw = safeStr(q);
      const term = raw.toLowerCase();
      const compact = compactStr(raw);

      const res1 = fuse.search(term);
      const res2 = fuse.search(compact);

      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const r of [...res1, ...res2]) {
        const item = r.item.ref as Product;
        const id = String((item as any).id);
        if (!seen.has(id)) {
          seen.add(id);
          merged.push(item);
        }
      }
      out = merged;
    }

    // category (normalized)
    if (cat) {
      out = out.filter((p) => {
        const inferred = inferCategory(p);
        const raw = normalizeCategoryName(safeStr((p as any).category));
        return inferred === cat || raw === cat;
      });
    }

    // brand (exact)
    if (brand) {
      const b = brand.toLowerCase();
      out = out.filter((p) => safeStr(p.brand).toLowerCase() === b);
    }

    // price
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

    // stock
    if (stockOnly) out = out.filter((p) => (p.stock ?? 0) > 0);

    // sort (in-stock → on-sale → newest → name)
    out.sort((a, b) => {
      const aIn = (a.stock ?? 0) > 0;
      const bIn = (b.stock ?? 0) > 0;
      if (aIn !== bIn) return aIn ? -1 : 1;

      const aSale =
        typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
      const bSale =
        typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
      if (aSale !== bSale) return aSale ? -1 : 1;

      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTs !== bTs) return bTs - aTs;

      return a.name.localeCompare(b.name);
    });

    return out;
  }, [base, q, cat, brand, priceMin, priceMax, stockOnly, fuse]);

  // Clear all filters
  const clearAll = useCallback(() => {
    setQ("");
    setCat("");
    setBrand("");
    setPriceMin("");
    setPriceMax("");
    setStockOnly(false);
  }, []);

  // Title line (unchanged)
  const pretty: Record<string, string> = {
    "power-banks": "Power Banks",
    chargers: "Chargers & Adapters",
    cables: "Cables",
    bags: "Bags & Sleeves",
    audio: "Audio",
    others: "Tech Accessories",
  };
  const title =
    cat && pretty[cat]
      ? `Best prices on ${pretty[cat]} in Sri Lanka`
      : "Best prices on Tech Accessories in Sri Lanka";

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="site-container py-6 space-y-4">
      {/* header row – search on RIGHT */}
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

      {/* filters dropdown */}
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
                    {pretty[c] ?? c}
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

      {/* grid – equal-height cards without changing ProductCard */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-6 text-slate-300">
          No products match your filters.
        </div>
      ) : (
        <ul className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.id} className="h-full">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}