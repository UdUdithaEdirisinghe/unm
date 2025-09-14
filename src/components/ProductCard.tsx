"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/cart/CartProvider";
import type { Product } from "../lib/products";
import { formatCurrency } from "../lib/format";
import { toast } from "react-hot-toast";
import { FaWhatsapp } from "react-icons/fa";

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
  const { add } = useCart();

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
      { id: product.id, name: product.name, price: priceToUse, image: primary, slug: product.slug },
      1
    );
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="relative flex flex-col rounded-xl bg-[#0b1220] border border-slate-800 p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
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

      {/* 📸 image */}
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

      {/* 📄 text */}
      <div className="mt-3 flex-1">
        <Link
          href={`/products/${product.slug}`}
          className="block text-white font-medium leading-snug line-clamp-2 hover:text-[#6574ff]"
          title={product.name}
        >
          {product.name}
        </Link>
        {product.brand && (
          <div className="mt-0.5 text-xs text-slate-400 truncate">{product.brand}</div>
        )}
        {(product as any).category && (
          <div className="text-xs text-slate-500 truncate">{(product as any).category}</div>
        )}
      </div>

      {/* 💰 price */}
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

      {/* 🛒 buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          className={`btn-primary flex-1 ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={outOfStock}
          onClick={handleAddToCart}
        >
          {outOfStock ? "Unavailable" : "Add to Cart"}
        </button>

        {/* WhatsApp quick-buy */}
        <Link
          href={`https://wa.me/94760703523?text=I'm interested in ${product.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white"
        >
          <FaWhatsapp size={20} />
        </Link>
      </div>
    </div>
  );
}