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

  // pick first valid image (or fallback)
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
    typeof salePrice === "number" && salePrice > 0 && salePrice < product.price;

  const priceToUse = hasSale ? (salePrice as number) : product.price;
  const discountPct =
    hasSale && salePrice
      ? Math.round(((product.price - salePrice) / product.price) * 100)
      : 0;

  const handleAddToCart = () => {
    add(
      { id: product.id, name: product.name, price: priceToUse, image: primary, slug: product.slug },
      1
    );
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="relative flex h-full flex-col rounded-xl bg-[#0b1220] border border-slate-800 p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* 🔖 badges */}
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

      {/* 📸 image (UPDATED — no inner white space, fixed 4:3 crop, modest size) */}
      <Link
  href={`/products/${product.slug}`}
  className="block overflow-hidden rounded-lg border border-slate-700 bg-slate-900/40"
>
  {/* Slightly taller than 4:3 → 5:4 */}
  <div className="relative w-full [aspect-ratio:9/8]">
    <Image
      src={primary}
      alt={product.name}
      fill
      className="object-cover object-center"
      quality={85}
      sizes="
        (min-width:1280px) calc((100vw - 8rem) / 4),
        (min-width:1024px) calc((100vw - 6rem) / 3),
        (min-width:640px)  calc((100vw - 4rem) / 2),
        calc((100vw - 2rem) / 2)
      "
    />
  </div>
</Link>



      {/* 📄 text */}
      <div className="mt-3 flex-1">
        {/* Reserve height for exactly 3 lines so nothing is cut off and rows align */}
        <div className="min-h-[3.75rem]">
          <Link
            href={`/products/${product.slug}`}
            className="block text-white text-[15px] font-medium leading-5 hover:text-[#6574ff] line-clamp-3"
            title={product.name}
          >
            {product.name}
          </Link>
        </div>

        {product.brand && (
          <div className="mt-0.5 text-xs text-slate-400 truncate">{product.brand}</div>
        )}
        {(product as any).category && (
          <div className="text-xs text-slate-500 truncate">{(product as any).category}</div>
        )}
      </div>

      {/* 💰 price (pinned to bottom) */}
      <div className="mt-auto flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
        <p className="text-lg font-semibold text-white">
          {formatCurrency(priceToUse)}
        </p>
        {hasSale && (
          <span className="text-sm text-slate-500 line-through">
            {formatCurrency(product.price)}
          </span>
        )}
      </div>

      {/* 🛒 add to cart button */}
      <div className="mt-3">
        <button
          className={`btn-primary w-full ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={outOfStock}
          onClick={handleAddToCart}
        >
          {outOfStock ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
