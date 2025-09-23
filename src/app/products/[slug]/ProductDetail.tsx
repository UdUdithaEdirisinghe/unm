"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useCart } from "../../../components/cart/CartProvider";
import type { Product } from "../../../lib/products";
import { formatCurrency } from "../../../lib/format";
import { toast } from "react-hot-toast";

export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const imgs = useMemo(() => {
    const arr = (product.images && product.images.length ? product.images : [product.image]).map(
      (s) => (s.startsWith("/") || /^https?:\/\//.test(s) ? s : `/${s}`)
    );
    return arr.length ? arr : ["/placeholder.png"];
  }, [product.images, product.image]);

  const [index, setIndex] = useState(0);

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
      {
        id: product.id,
        name: product.name,
        price: priceToUse,
        image: imgs[0],
        slug: product.slug,
      },
      qty
    );
    toast.success(`${product.name} added to cart!`);
  };

  const renderSpecs = () => {
    const s: any = product.specs;
    if (!s) return null;
    if (typeof s === "object" && !Array.isArray(s)) {
      return Object.entries(s)
        .filter(([k, v]) => String(k).trim() && String(v ?? "").trim())
        .map(([k, v]) => (
          <li key={k}>
            <span className="font-medium text-slate-200">{k}:</span>{" "}
            <span className="text-slate-300">{String(v)}</span>
          </li>
        ));
    }
    if (Array.isArray(s)) {
      return s.map((t: string, i: number) => <li key={i}>{t}</li>);
    }
    return null;
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Gallery */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800/60 bg-[rgba(10,15,28,0.4)]">
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

        <div className="aspect-[4/3] flex items-center justify-center bg-white">
          <Image
            src={imgs[index]}
            alt={`${product.name} ${index + 1}`}
            width={800}
            height={600}
            sizes="(max-width: 1024px) 100vw, 800px"
            className="object-contain"
            priority
          />
        </div>

        {/* Thumbnails */}
        {imgs.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-[rgba(10,15,28,0.5)] border-t border-slate-800/60">
            {imgs.map((src, i) => (
              <button
                key={i}
                className={`shrink-0 rounded border ${
                  i === index ? "border-indigo-500" : "border-slate-700"
                } bg-slate-900`}
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`thumb-${i}`} className="h-16 w-20 object-contain rounded" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h1 className="text-3xl font-bold mb-1 text-white">{product.name}</h1>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {product.brand && <p className="text-slate-300">{product.brand}</p>}
          {product.category && (
            <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200">
              {product.category}
            </span>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{formatCurrency(priceToUse)}</p>
            <span className="hidden sm:inline text-slate-400 line-through">
              {hasSale ? formatCurrency(product.price) : ""}
            </span>
          </div>
          {hasSale && (
            <div className="sm:hidden text-slate-400 line-through">
              {formatCurrency(product.price)}
            </div>
          )}
        </div>

        {/* Overview (Short Description) */}
        {product.shortDesc && (
            <div className="mb-6 max-w-prose leading-relaxed text-slate-300">
            <h3 className="font-semibold text-white mb-2">Overview</h3>
            <p className="whitespace-pre-line">{product.shortDesc}</p>
          </div>
        )}

        {/* Specifications */}
        <h3 className="font-semibold text-white mb-2">Specifications</h3>
        <ul className="list-disc pl-5 text-slate-300 mb-6">{renderSpecs()}</ul>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800">
            <button
              type="button"
              className="h-9 w-9 border-r border-slate-700 text-white"
              onClick={() => setQty((n) => Math.max(1, n - 1))}
            >
              −
            </button>
            <span className="px-3 tabular-nums text-white">{qty}</span>
            <button
              type="button"
              className="h-9 w-9 border-l border-slate-700 text-white"
              onClick={() => setQty((n) => n + 1)}
            >
              +
            </button>
          </div>

          <button type="button" className="btn-primary" disabled={outOfStock} onClick={handleAddToCart}>
            {outOfStock ? "Unavailable" : "Add to Cart"}
          </button>

          <Link href="/products" className="btn-secondary">
            Back to Products
          </Link>
        </div>
      </div>
    </div>
  );
}