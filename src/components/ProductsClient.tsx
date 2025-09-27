// src/components/ProductsClient.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { Product } from "../lib/products";

type Props = {
products: Product[];
initialQuery?: string;
initialCat?: string;
initialBrand?: string;
};

function norm(s: string) {
return (s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim();
}

/** basic token match that respects your original fields */
function matches(p: Product, q: string) {
const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
if (!tokens.length) return true;
const hay = [p.name ?? "", p.brand ?? "", (p as any).category ?? "", (p as any).slug ?? ""]
.map(String)
.join(" ")
.toLowerCase();
return tokens.every((t) => hay.includes(t));
}

/** same ordering semantics as your server helper */
function sortForList(a: Product, b: Product) {
const aIn = (a.stock ?? 0) > 0;
const bIn = (b.stock ?? 0) > 0;
if (aIn !== bIn) return aIn ? -1 : 1;

const aSale = typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
// ✅ fixed bug that caused “referenced in its own initializer”
const bSale = typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
if (aSale !== bSale) return aSale ? -1 : 1;

const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
if (aTs !== bTs) return bTs - aTs;

return a.name.localeCompare(b.name);
}

export default function ProductsClient({
products,
initialQuery = "",
initialCat,
initialBrand,
}: Props) {
// seed from props to avoid hydration mismatches
const [q, setQ] = useState<string>(initialQuery);
const [cat, setCat] = useState<string>(initialCat ?? "");
const [brand, setBrand] = useState<string>(initialBrand ?? "");
const [open, setOpen] = useState<boolean>(false);
const [priceMin, setPriceMin] = useState<number | "">("");
const [priceMax, setPriceMax] = useState<number | "">("");

useEffect(() => {
setQ(initialQuery);
setCat(initialCat ?? "");
setBrand(initialBrand ?? "");
}, [initialQuery, initialCat, initialBrand]);

// facets from current list (safe guards everywhere)
const facets = useMemo(() => {
const list: Product[] = Array.isArray(products) ? products : [];
const brands = new Set<string>();
const cats = new Set<string>();
let min = Number.POSITIVE_INFINITY;
let max = 0;

for (const p of list) {
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
}, [products]);

// apply client filters (keeps SSR result consistent; no window usage)
const filtered = useMemo(() => {
let out: Product[] = (Array.isArray(products) ? products : []).slice();

if (q) out = out.filter((p) => matches(p, q));
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

return out.sort(sortForList);
}, [products, q, cat, brand, priceMin, priceMax]);

const clearAll = useCallback(() => {
setQ("");
setCat("");
setBrand("");
setPriceMin("");
setPriceMax("");
}, []);

return (
<div className="site-container py-6">
{/* top bar */}
<div className="mb-4 flex items-center justify-between gap-3">
<button
type="button"
className="btn-secondary"
onClick={() => setOpen((v) => !v)}
aria-expanded={open}
aria-controls="filters-panel"
>
{open ? "Hide filters" : "Show filters"}
</button>
<div className="text-sm text-slate-300">
{filtered.length} item{filtered.length === 1 ? "" : "s"}
</div>
</div>

{/* dropdown filters */}
{open && (
<section
id="filters-panel"
className="mb-6 rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.45)] p-4"
>
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
{/* search */}
<label className="block text-sm text-slate-300">
Search
<input
value={q}
onChange={(e) => setQ(e.target.value)}
className="input mt-1 w-full"
placeholder="Search products…"
/>
</label>

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

{/* product grid — same palette/components you already use */}
{filtered.length === 0 ? (
<div className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] p-6 text-slate-300">
No products match your filters.
</div>
) : (
<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
{filtered.map((p) => {
const img = (p.images?.[0] || p.image) ?? "/placeholder.png";
const eff =
typeof p.salePrice === "number" && p.salePrice > 0 && p.salePrice < p.price
? (p.salePrice as number)
: p.price;

return (
<li
key={p.id}
className="rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] p-3"
>
<a href={`/products/${p.slug}`} className="block">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
src={img}
alt={p.name}
className="h-40 w-full rounded object-contain bg-white"
/>
<div className="mt-3">
<p className="line-clamp-2 text-sm font-medium text-white">{p.name}</p>
<p className="mt-1 text-sm text-slate-300">
{Intl.NumberFormat("en-LK", {
style: "currency",
currency: "LKR",
maximumFractionDigits: 0,
}).format(eff)}
</p>
</div>
</a>
</li>
);
})}
</ul>
)}
</div>
);
}
