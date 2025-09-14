"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../components/cart/CartProvider";
import type { Product } from "../lib/products";
import { formatCurrency } from "../lib/format";
import { toast } from "react-hot-toast";

/* helpers */
const str = (v: unknown) => (typeof v === "string" ? v : "");
const isHttp = (u: string) => u.startsWith("http://") || u.startsWith("https://");
const imgSrc = (v: unknown) => {
  const t = str(v).trim();
  if (!t) return "/placeholder.png";
  return t.startsWith("/") || isHttp(t) ? t : `/${t}`;
};

type Props = { product: Product };

export default function ProductCard({ product }: Props) {
  const { add } = useCart();
  const img = imgSrc((product as any).image ?? product.image);

  const price = Number(product.price ?? 0);
  const sale = typeof product.salePrice === "number" ? product.salePrice : undefined;
  const hasSale = typeof sale === "number" && sale > 0 && sale < price;

  const stock = Number(product.stock ?? 0);
  const out = stock <= 0;

  const priceToUse = hasSale ? (sale as number) : price;
  const pct = hasSale && sale ? Math.round(((price - sale) / Math.max(1, price)) * 100) : 0;

  const addToCart = () => {
    add(
      {
        id: String((product as any).id ?? product.id),
        name: str(product.name) || "Product",
        price: priceToUse,
        image: img,
        slug: str(product.slug),
      },
      1
    );
    toast.success(`${str(product.name) || "Product"} added to cart!`);
  };

  return (
    <div className="relative flex flex-col rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.6)] p-3">
      {/* badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {out && (
          <span className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white shadow">
            Out of stock
          </span>
        )}
        {!out && pct > 0 && (
          <span className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow">
            -{pct}%
          </span>
        )}
      </div>

      {/* image */}
      <Link
        href={`/products/${str(product.slug)}`}
        className="block rounded-md overflow-hidden border border-slate-800/60 bg-[rgba(10,15,28,0.4)]"
      >
        <div className="aspect-[4/3] flex items-center justify-center">
          <Image
            src={img}
            alt={str(product.name) || "Product"}
            width={600}
            height={450}
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-contain max-h-48"
          />
        </div>
      </Link>

      {/* text block */}
      <div className="mt-3 flex-1 min-h-[3.25rem]">
        <Link
          href={`/products/${str(product.slug)}`}
          className="block font-medium text-white text-sm sm:text-base leading-snug two-line"
          title={str(product.name)}
        >
          {str(product.name)}
        </Link>
        {str(product.brand) && (
          <div className="text-xs text-slate-400 truncate">{str(product.brand)}</div>
        )}
        {str((product as any).category) && (
          <div className="text-xs text-slate-500 truncate">
            {str((product as any).category)}
          </div>
        )}
      </div>

      {/* price */}
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
          className={`btn-primary w-full ${out ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={out}
          onClick={addToCart}
        >
          {out ? "Unavailable" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}