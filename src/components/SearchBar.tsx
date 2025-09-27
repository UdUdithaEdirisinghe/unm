// src/components/ProductsClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "../lib/products";
import { formatCurrency } from "../lib/format";

/* ---------- helpers ---------- */
type SortKey = "popular" | "new" | "price-asc" | "price-desc";

function num(v: unknown, d = 0) {
const n = Number(v);
return Number.isFinite(n) ? n : d;
}
function clamp(n: number, lo: number, hi: number) {
return Math.max(lo, Math.min(hi, n));
}
function inferCategory(p: Product) {
const raw = (p.category || "").toString().trim().toLowerCase();
if (raw) return raw;
const s = `${p.name} ${p.slug}`.toLowerCase();
if (s.includes("power") && s.includes("bank")) return "power-banks";
if (/(charger|adapter|adaptor|gan)/.test(s)) return "chargers";
if (/(cable|type c|lightning|usb)/.test(s)) return "cables";
return "others";
}

/* ---------- component ---------- */
export default function ProductsClient(props: {
products: Product[];
initialQuery?: string;
initialCat?: string;
initialBrand?: string | null;
initialMin?: string | null;
initialMax?: string | null;
initialStock?: boolean;
initialSort?: string | null;
}) {
const router = useRouter();
const sp = useSearchParams();

// build facets from the server list once
const facets = useMemo(() => {
const brands = new Set<string>();
const cats = new Set<string>();
let minPrice = Infinity;
let maxPrice = 0;

for (const p of props.products) {
if (p.brand) brands.add(p.brand);
cats.add(inferCategory(p));
minPrice = Math.min(minPrice, p.salePrice ?? p.price);
maxPrice = Math.max(maxPrice, p.price);
}
if (!isFinite(minPrice)) minPrice = 0;
return {
brands: Array.from(brands).sort(),
cats: Array.from(cats).sort(),
minPrice,
maxPrice,
};
}, [props.products]);

// UI state seeded from URL (or server-provided initial*)
const [q, setQ] = useState(sp.get("q") ?? props.initialQuery ?? "");
const [cat, setCat] = useState(sp.get("cat") ?? props.initialCat ?? "");
const [brand, setBrand] = useState(sp.get("brand") ?? props.initialBrand ?? "");
const [onlyInStock, setOnlyInStock] = useState(
(sp.get("stock") ?? (props.initialStock ? "in" : "")) === "in"
);
const [min, setMin] = useState(
sp.get("min") ?? props.initialMin ?? (facets.minPrice ? String(facets.minPrice) : "")
);
const [max, setMax] = useState(
sp.get("max") ?? props.initialMax ?? (facets.maxPrice ? String(facets.maxPrice) : "")
);
const [sort, setSort] = useState<SortKey>(
((sp.get("sort") ?? props.initialSort) as SortKey) || "popular"
);

// keep URL in sync (no full reload)
useEffect(() => {
const p = new URLSearchParams();
if (q.trim()) p.set("q", q.trim());
if (cat) p.set("cat", cat);
if (brand) p.set("brand", brand);
if (min) p.set("min", String(clamp(num(min), 0, 9_999_999)));
if (max) p.set("max", String(clamp(num(max), 0, 9_999_999)));
if (onlyInStock) p.set("stock", "in");
if (sort && sort !== "popular") p.set("sort", sort);

const qs = p.toString();
router.replace(qs ? `/products?${qs}` : "/products");
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [q, cat, brand, min, max, onlyInStock, sort]);

// apply filters client-side (we already have the products list)
const filtered = useMemo(() => {
const lo = num(min, 0);
const hi = num(max, Number.MAX_SAFE_INTEGER);

let list = props.products.filter((p) => {
const price = p.salePrice ?? p.price;
if (onlyInStock && (p.stock ?? 0) <= 0) return false;
if (cat && inferCategory(p) !== cat) return false;
if (brand && (p.brand || "").toLowerCase() !== brand.toLowerCase()) return false;
if (!(price >= lo && price <= hi)) return false;

// light text match (name + brand + slug + category)
if (q.trim()) {
const needle = q.trim().toLowerCase();
const hay = [p.name, p.brand || "", p.slug, p.category || ""]
.join(" ")
.toLowerCase();
if (!hay.includes(needle)) return false;
}
return true;
});

// sort
list = list.slice().sort((a, b) => {
if (sort === "new") {
const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
return bT - aT;
}
if (sort === "price-asc") {
const ap = a.salePrice ?? a.price;
const bp = b.salePrice ?? b.price;
return ap - bp;
}
if (sort === "price-desc") {
const ap = a.salePrice ?? a.price;
const bp = b.salePrice ?? b.price;
return bp - ap;
}
// "popular" fallback: in-stock first, then newest
const aIn = (a.stock ?? 0) > 0;
const bIn = (b.stock ?? 0) > 0;
if (aIn !== bIn) return aIn ? -1 : 1;
const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
if (aT !== bT) return bT - aT;
return a.name.localeCompare(b.name);
});

return list;
}, [props.products, q, cat, brand, min, max, onlyInStock, sort]);

const clearAll = () => {
setQ("");
setCat("");
setBrand("");
setOnlyInStock(false);
setMin(facets.minPrice ? String(facets.minPrice) : "");
setMax(facets.maxPrice ? String(facets.maxPrice) : "");
setSort("popular");
};

return (
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
{/* ================== Filters ================== */}
<aside className="panel border border-slate-800/60 bg-[rgba(10,15,28,0.4)] rounded-lg p-4">
<div className="mb-4">
<input
value={q}
onChange={(e) => setQ(e.target.value)}
placeholder="Search…"
className="input w-full"
/>
</div>

<div className="mb-4">
<label className="block text-sm text-slate-300 mb-1">Category</label>
<select
className="select w-full"
value={cat}
onChange={(e) => setCat(e.target.value)}
>
<option value="">All</option>
{facets.cats.map((c) => (
<option key={c} value={c}>
{c.replace(/-/g, " ")}
</option>
))}
</select>
</div>

<div className="mb-4">
<label className="block text-sm text-slate-300 mb-1">Brand</label>
<select
className="select w-full"
value={brand}
onChange={(e) => setBrand(e.target.value)}
>
<option value="">All</option>
{facets.brands.map((b) => (
<option key={b} value={b}>
{b}
</option>
))}
</select>
</div>

<div className="mb-4 flex items-center gap-2">
<input
id="stock"
type="checkbox"
checked={onlyInStock}
onChange={(e) => setOnlyInStock(e.target.checked)}
/>
<label htmlFor="stock" className="text-sm text-slate-300">
In stock only
</label>
</div>

<div className="mb-4">
<label className="block text-sm text-slate-300 mb-1">Price (LKR)</label>
<div className="flex items-center gap-2">
<input
inputMode="numeric"
className="input w-full"
placeholder={String(facets.minPrice || 0)}
value={min}
onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))}
/>
<span className="text-slate-400">—</span>
<input
inputMode="numeric"
className="input w-full"
placeholder={String(facets.maxPrice || 0)}
value={max}
onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))}
/>
</div>
</div>

<div className="mb-5">
<label className="block text-sm text-slate-300 mb-1">Sort by</label>
<select
className="select w-full"
value={sort}
onChange={(e) => setSort(e.target.value as SortKey)}
>
<option value="popular">Popular</option>
<option value="new">Newest</option>
<option value="price-asc">Price: Low → High</option>
<option value="price-desc">Price: High → Low</option>
</select>
</div>

<button type="button" className="btn-ghost w-full" onClick={clearAll}>
Clear filters
</button>
</aside>

{/* ================== Results ================== */}
<section>
{filtered.length === 0 ? (
<div className="panel rounded-lg border border-slate-800/60 p-8 text-slate-300">
No matching products.
</div>
) : (
<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
{filtered.map((p) => {
const price = p.salePrice && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
const onSale = p.salePrice && p.salePrice > 0 && p.salePrice < p.price;
const out = (p.stock ?? 0) <= 0;
const img = (p.images?.[0] || p.image || "/placeholder.png");

return (
<li key={p.id} className="card rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.45)] overflow-hidden">
<Link href={`/products/${p.slug}`} className="block">
<div className="aspect-[4/3] bg-white flex items-center justify-center">
<Image
src={img}
alt={p.name}
width={600}
height={450}
className="object-contain"
/>
</div>
<div className="p-3">
<h3 className="line-clamp-2 font-semibold text-white">{p.name}</h3>
<div className="mt-2 flex items-baseline gap-2">
<span className="text-white font-bold">{formatCurrency(price)}</span>
{onSale && (
<span className="text-slate-400 line-through text-sm">
{formatCurrency(p.price)}
</span>
)}
</div>
{out && (
<div className="mt-2 text-xs font-semibold text-rose-400">Out of stock</div>
)}
</div>
</Link>
</li>
);
})}
</ul>
)}
</section>
</div>
);
}
