// src/components/ProductsClient.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Product } from "../lib/products";
import SearchBarComp from "./SearchBar"; // <-- alias so it can't collide
import ProductCard from "./ProductCard";

type Props = {
products: Product[];
initialQuery?: string;
initialCat?: string;
initialBrand?: string;
};

function norm(s: string) {
return (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim();
}

export default function ProductsClient({
products,
initialQuery = "",
initialCat,
initialBrand,
}: Props) {
const base: Product[] = Array.isArray(products) ? products : [];

const [q, setQ] = useState<string>(initialQuery);
const [open, setOpen] = useState<boolean>(false);
const [cat, setCat] = useState<string>(initialCat ?? "");
const [brand, setBrand] = useState<string>(initialBrand ?? "");
const [priceMin, setPriceMin] = useState<number | "">("");
const [priceMax, setPriceMax] = useState<number | "">("");

useEffect(() => {
setQ(initialQuery);
setCat(initialCat ?? "");
setBrand(initialBrand ?? "");
}, [initialQuery, initialCat, initialBrand]);

const facets = useMemo(() => {
const brands = new Set<string>();
const cats = new Set<string>();
let min = Number.POSITIVE_INFINITY;
let max = 0;

for (const p of base) {
if (p.brand) brands.add(String(p.brand));
if ((p as any).category) cats.add(String((p as any).category));
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

if (q) {
const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
out = out.filter((p) =>
tokens.every((t) =>
[p.name ?? "", p.brand ?? "", (p as any).category ?? "", p.slug ?? ""]
.join(" ")
.toLowerCase()
.includes(t)
)
);
}

if (cat) out = out.filter((p) => norm((p as any).category ?? "") === norm(cat));
if (brand) out = out.filter((p) => norm(p.brand ?? "") === norm(brand));

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

out.sort((a, b) => {
const aIn = (a.stock ?? 0) > 0;
const bIn = (b.stock ?? 0) > 0;
if (aIn !== bIn) return aIn ? -1 : 1;

const aSale = typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
const bSale = typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
if (aSale !== bSale) return aSale ? -1 : 1;

const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
if (aTs !== bTs) return bTs - aTs;

return a.name.localeCompare(b.name);
});

return out;
}, [base, q, cat, brand, priceMin, priceMax]);

const clearAll = useCallback(() => {
setQ("");
setCat("");
setBrand("");
setPriceMin("");
setPriceMax("");
}, []);

return (
<div className="site-container py-6">
{/* Search bar (aliased component; no TS collision) */}
<div className="mb-4">
<SearchBarComp className="max-w-xl" placeholder="Search products…" />
</div>

<div className="mb-4">
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

{open && (
<section
id="filters-panel"
className="mb-6 rounded-xl border border-slate-800 bg-[#0b1220] p-4"
>
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))}
className="input"
placeholder={`Min${facets.minPrice ? ` ≥ ${facets.minPrice}` : ""}`}
/>
<input
inputMode="numeric"
pattern="[0-9]*"
value={priceMax === "" ? "" : String(priceMax)}
onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))}
className="input"
placeholder={`Max${facets.maxPrice ? ` ≤ ${facets.maxPrice}` : ""}`}
/>
</div>
</div>
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
