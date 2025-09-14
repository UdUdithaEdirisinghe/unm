// src/components/ProductCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/cart/CartProvider";
import type { Product } from "../lib/products";
import { formatCurrency } from "../lib/format";
import { toast } from "react-hot-toast";

/* ---------- tiny helpers (no regex) ---------- */
function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function isHttpUrl(s: string) {
  const l = s.toLowerCase();
  return l.startsWith("http://") || l.startsWith("https://");
}
function normalizeSrc(v: unknown): string {
  const s = toStr(v).trim();
  if (!s) return "/placeholder.png";
  if (s.startsWith("/") || isHttpUrl(s)) return s;
  return `/${s}`;
}

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
  const { add } = useCart();

  const img = normalizeSrc((product as any).image ?? product?.image);

  const price = Number(product.price ?? 0);
  const salePrice =
    typeof product.salePrice === "number" ? product.salePrice : undefined;

  const stock = Number(product.stock ?? 0);
  const outOfStock = stock <= 0;
  const hasSale =
    typeof salePrice === "number" && salePrice > 0 && salePrice < price;

  const priceToUse = hasSale ? (salePrice as number) : price;
  const discountPct =
    hasSale && salePrice
      ? Math.round(((price - salePrice) / Math.max(1, price)) * 100)
      : 0;

  const handleAddToCart = () => {
    add(
      {
        id: String(product.id),
        name: toStr(product.name) || "Product",
        price: priceToUse,
        image: img,
        slug: toStr(product.slug),
      },
      1
    );
    toast.success(`${toStr(product.name) || "Product"} added to cart!`);
  };

  return (
    <div className="relative flex flex-col rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-3">
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

      {/* image area */}
      <Link
        href={`/products/${toStr(product.slug)}`}
        className="block rounded-md overflow-hidden border border-slate-800/60 bg-[rgba(10,15,28,0.4)]"
      >
        <div className="aspect-[4/3] flex items-center justify-center">
          <Image
            src={img}
            alt={toStr(product.name) || "Product image"}
            width={600}
            height={450}
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-contain max-h-48"
            priority={false}
          />
        </div>
      </Link>

      {/* text block */}
      <div className="mt-3 flex-1 min-h-[3.25rem]"> {/* reserve space for 2 lines */}
        <Link
          href={`/products/${toStr(product.slug)}`}
          className="block font-medium text-white text-sm sm:text-base leading-snug line-clamp-2"
          title={toStr(product.name)}
        >
          {toStr(product.name)}
        </Link>

        {toStr(product.brand) && (
          <div className="text-xs text-slate-400 truncate">{toStr(product.brand)}</div>
        )}
        {toStr((product as any).category) && (
          <div className="text-xs text-slate-500 truncate">
            {toStr((product as any).category)}
          </div>
        )}
      </div>

      {/* price block → stacked on mobile, inline on desktop */}
      <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
        <p className="text-lg font-semibold text-white">
          {formatCurrency(priceToUse)}
        </p>
        {hasSale && (
          <span className="text-sm text-slate-400 line-through">
            {formatCurrency(price)}
          </span>
        )}
      </div>

      {/* button */}
      <div className="mt-3">
        <button
          className={`btn-primary w-full ${
            outOfStock ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={outOfStock}
          onClick={handleAddToCart}
        >
          {outOfStock ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}