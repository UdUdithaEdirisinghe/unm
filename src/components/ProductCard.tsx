"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/cart/CartProvider";
import type { Product } from "../lib/products";
import { formatCurrency } from "../lib/format";
import { toast } from "react-hot-toast";

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
const { add } = useCart();

// Primary image (keeps your current behavior)
const primary = (() => {
const src =
(Array.isArray(product.images) && product.images[0]) ||
product.image ||
"/placeholder.png";
const s = String(src || "");
return s.startsWith("/") || /^https?:\/\//.test(s) ? s : `/${s}`;
})();

const salePrice = product.salePrice;
const stock = product.stock ?? 0;
const outOfStock = stock <= 0;
const hasSale =
typeof salePrice === "number" &&
salePrice > 0 &&
salePrice < product.price;

const priceToUse = hasSale ? (salePrice as number) : product.price;
const discountPct =
hasSale && salePrice
? Math.round(((product.price - salePrice) / product.price) * 100)
: 0;

const handleAddToCart = () => {
add(
{
id: product.id,
name: product.name,
price: priceToUse,
image: primary,
slug: product.slug,
},
1
);
toast.success(`${product.name} added to cart!`);
};

return (
<div className="relative flex h-full flex-col rounded-xl bg-[#0b1220] border border-slate-800 p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
{/* badges */}
<div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
{outOfStock && (
<span className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white shadow">
Out of stock
</span>
)}
{!outOfStock && discountPct > 0 && (
<span className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow">
-{discountPct}%
</span>
)}
</div>

{/* image */}
<Link
href={`/products/${product.slug}`}
className="block rounded-lg overflow-hidden border border-slate-700 bg-slate-900/40"
>
<div className="aspect-4-3 flex items-center justify-center">
<Image
src={primary}
alt={product.name}
width={600}
height={450}
sizes="(max-width: 640px) 100vw, 600px"
className="object-contain max-h-48"
/>
</div>
</Link>

{/* text */}
<div className="mt-3">
{/* Title – clamp with a *small* reserved height so rows align without big gaps */}
<Link
href={`/products/${product.slug}`}
title={product.name}
className="block text-white font-medium leading-snug hover:text-[#6574ff] line-clamp-3 min-h-[3.6rem]"
>
{product.name}
</Link>

{/* Brand & Category directly under title.
We keep a tiny reserved height; if one is missing,
we drop an invisible placeholder so cards still align. */}
<div className="mt-1 space-y-0.5 min-h-[1.5rem]">
{product.brand ? (
<div className="text-xs text-slate-400 truncate">{product.brand}</div>
) : (
<div aria-hidden className="text-xs opacity-0 select-none">.</div>
)}
{(product as any).category ? (
<div className="text-xs text-slate-500 truncate">
{(product as any).category}
</div>
) : (
<div aria-hidden className="text-xs opacity-0 select-none">.</div>
)}
</div>
</div>

{/* push footer down uniformly */}
<div className="flex-1" />

{/* price */}
<div className="mt-2 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
<p className="text-lg font-semibold text-white">
{formatCurrency(priceToUse)}
</p>
{hasSale && (
<span className="text-sm text-slate-500 line-through">
{formatCurrency(product.price)}
</span>
)}
</div>

{/* button */}
<div className="mt-3">
<button
onClick={handleAddToCart}
disabled={outOfStock}
className={`btn-primary w-full ${
outOfStock ? "opacity-50 cursor-not-allowed" : ""
}`}
>
{outOfStock ? "Unavailable" : "Add to Cart"}
</button>
</div>
</div>
);
}
