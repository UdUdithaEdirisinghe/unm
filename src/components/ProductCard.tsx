"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/cart/CartProvider";
import type { Product } from "../lib/products";
import { formatCurrency } from "../lib/format";

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
  const { add } = useCart();

  const img =
    typeof product.image === "string" && product.image.trim()
      ? product.image.startsWith("/") || /^https?:\/\//.test(product.image)
        ? product.image
        : `/${product.image}`
      : "/placeholder.png";

  const salePrice = product.salePrice;
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const hasSale =
    typeof salePrice === "number" && salePrice > 0 && salePrice < product.price;

  const priceToUse = hasSale ? salePrice : product.price;

  const discountPct =
    hasSale && salePrice
      ? Math.round(((product.price - salePrice) / product.price) * 100)
      : 0;

  return (
    <div className="relative rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-3 flex flex-col">
      {/* Badges */}
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

      {/* Image → detail page */}
      <Link
        href={`/products/${product.slug}`}
        className="block rounded-md overflow-hidden border border-slate-800/60 bg-[rgba(10,15,28,0.4)]"
      >
        <div className="aspect-[4/3] flex items-center justify-center">
          <Image
            src={img}
            alt={product.name}
            width={600}
            height={450}
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-contain"
          />
        </div>
      </Link>

      {/* Title / brand */}
      <div className="mt-3 flex-1">
        <Link
          href={`{products/${product.slug}`}
          className="block truncate font-medium text-white"
          title={product.name}
        >
          {product.name}
        </Link>
        {product.brand && (
          <div className="text-xs text-slate-400 truncate">{product.brand}</div>
        )}
      </div>

      {/* Price row */}
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-lg font-semibold text-white">
          {formatCurrency(priceToUse)}
        </p>
        {hasSale && (
          <span className="text-sm text-slate-400 line-through">
            {formatCurrency(product.price)}
          </span>
        )}
      </div>

      {/* Add to cart */}
      <div className="mt-3">
        <button
          className={`btn-primary w-full ${
            outOfStock ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={outOfStock}
          onClick={() =>
            add(
              {
                id: product.id,
                name: product.name,
                price: priceToUse,
                image: img,
                slug: product.slug,
              },
              1
            )
          }
        >
          {outOfStock ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}