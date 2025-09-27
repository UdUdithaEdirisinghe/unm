"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Product } from "../lib/products";
import SearchBar from "./SearchBar";
import ProductCard from "./ProductCard";

/* ---------- utils ---------- */
function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim();
}
const compact = (s: string) => norm(s).replace(/[\s\-_/\.]/g, "");

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
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function scoreTokenAgainstField(token: string, field: string): number {
  if (!token || !field) return 0;
  const f = norm(field);
  const words = f.split(" ").filter(Boolean);
  const t = norm(token);
  const fC = compact(f);
  const tC = compact(t);

  if (words.includes(t)) return 1.0;
  if (words.some((w) => w.startsWith(t))) return 0.8;
  if (f.includes(t)) return 0.6;
  if (fC.includes(tC)) return 0.7;
  if (fC.startsWith(tC)) return 0.78;

  if (t.length >= 4) {
    for (const w of words) {
      if (Math.abs(w.length - t.length) > 1) continue;
      const d = levenshtein(t, w);
      if (d <= 1) return 0.72 - d * 0.1;
    }
    if (Math.abs(fC.length - tC.length) <= 1) {
      const d2 = levenshtein(tC, fC);
      if (d2 <= 1) return 0.7 - d2 * 0.08;
    }
  }
  return 0;
}

function matches(product: Product, q: string) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystacks: string[] = [
    product.name ?? "",
    product.brand ?? "",
    (product as any).category ?? (product as any).type ?? "",
    product.slug ?? "",
  ].map((s) => String(s ?? ""));

  return tokens.every((t) =>
    haystacks.some((h) => scoreTokenAgainstField(t, h) > 0.55)
  );
}

/* ---------- component ---------- */
type Props = {
  products: Product[];
  initialQuery?: string;
  initialCat?: string;
  initialBrand?: string;
};

export default function ProductsClient({
  products,
  initialQuery = "",
  initialCat,
  initialBrand,
}: Props) {
  const base: Product[] = Array.isArray(products) ? products : [];

  const [q, setQ] = useState<string>(initialQuery ?? "");
  const [open, setOpen] = useState<boolean>(false);
  const [cat, setCat] = useState<string>(initialCat ?? "");
  const [brand, setBrand] = useState<string>(initialBrand ?? "");
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [stockOnly, setStockOnly] = useState(false);

  useEffect(() => {
    setQ(initialQuery ?? "");
    setCat(initialCat ?? "");
    setBrand(initialBrand ?? "");
  }, [initialQuery, initialCat, initialBrand]);

  const facets = useMemo(() => {
    const brands = new Set<string>();
    const cats = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const p of base) {
      if (p.brand) brands.add(String(p.brand ?? ""));
      if ((p as any).category) cats.add(String((p as any).category ?? ""));
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
      brands: Array.from(brands).sort(),
      cats: Array.from(cats).sort(),
      minPrice: min,
      maxPrice: max,
    };
  }, [base]);

  const filtered = useMemo(() => {
    let out = base.slice();

    // fuzzy search
    if (q) out = out.filter((p) => matches(p, q));

    // strict category + brand (no guessing, just raw compare)
    if (cat) out = out.filter((p) => norm((p as any).category ?? "") === norm(cat));
    if (brand) out = out.filter((p) => norm(p.brand ?? "") === norm(brand));

    // price range
    if (priceMin !== "" || priceMax !== "") {
      out = out.filter((p) => {
        const eff =
          typeof p.salePrice === "number" && p.salePrice > 0 && p.salePrice < p.price
            ? p.salePrice
            : p.price;
        if (priceMin !== "" && eff < Number(priceMin)) return false;
        if (priceMax !== "" && eff > Number(priceMax)) return false;
        return true;
      });
    }

    if (stockOnly) out = out.filter((p) => (p.stock ?? 0) > 0);

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

  return (
    <div className="site-container py-6">
      {/* search + toggle row */}
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="filters-panel"
        >
          {open ? "Hide filters" : "Show filters"}
        </button>
        <SearchBar initial={q} placeholder="Search products…" className="max-w-md" />
      </div>

      {open && (
        <section
          id="filters-panel"
          className="mb-6 rounded-xl border border-slate-800 bg-[#0b1220] p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* category */}
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
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {/* brand */}
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

            {/* price */}
            <label className="block text-sm text-slate-300">
              Min Price
              <input
                type="number"
                value={priceMin === "" ? "" : priceMin}
                onChange={(e) =>
                  setPriceMin(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="input mt-1 w-full"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Max Price
              <input
                type="number"
                value={priceMax === "" ? "" : priceMax}
                onChange={(e) =>
                  setPriceMax(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="input mt-1 w-full"
              />
            </label>

            {/* stock only */}
            <label className="flex items-center gap-2 text-slate-300 mt-2">
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

      {/* results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-6 text-slate-300">
          No products match your filters.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}