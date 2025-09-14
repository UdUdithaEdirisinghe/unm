// src/app/products/[slug]/ProductDetail.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useCart } from "../../../components/cart/CartProvider";
import type { Product } from "../../../lib/products";
import { formatCurrency } from "../../../lib/format";
import { toast } from "react-hot-toast";

/* ---------- strict helpers (no regex needed) ---------- */
function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function isHttpUrl(s: string) {
  const lower = s.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://");
}
function normalizeSrc(v: unknown): string {
  const s = toStr(v).trim();
  if (!s) return "/placeholder.png";
  if (s.startsWith("/") || isHttpUrl(s)) return s;
  return `/${s}`;
}
function arrayOf<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  // images: accept product.images (array) or product.image (string)
  const imgs = useMemo(() => {
    const base = arrayOf<string>(product?.images);
    if (base.length === 0 && product?.image) base.push(product.image as any);
    const normalized = base.map(normalizeSrc).filter(Boolean);
    return normalized.length ? normalized : ["/placeholder.png"];
  }, [product]);

  const [index, setIndex] = useState(0);

  const price = Number(product?.price ?? 0);
  const salePrice = typeof product?.salePrice === "number" ? product.salePrice : undefined;
  const stock = Number(product?.stock ?? 0);
  const outOfStock = stock <= 0;
  const hasSale = typeof salePrice === "number" && salePrice > 0 && salePrice < price;

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
        image: imgs[0],
        slug: toStr(product.slug),
      },
      qty
    );
    toast.success(`${toStr(product.name) || "Product"} added to cart!`);
  };

  /* ---------- safe specs renderer ---------- */
  const renderSpecs = () => {
    const s: unknown = product?.specs;
    if (!s) return null;

    // object map (key: value)
    if (typeof s === "object" && !Array.isArray(s)) {
      return Object.entries(s as Record<string, unknown>)
        .filter(([k, v]) => String(k).trim() && String(v ?? "").trim())
        .map(([k, v]) => (
          <li key={k}>
            <span className="font-medium text-slate-200">{k}:</span>{" "}
            <span className="text-slate-300">{String(v)}</span>
          </li>
        ));
    }
    // array of strings
    if (Array.isArray(s)) {
      return (s as unknown[]).map((t, i) => <li key={i}>{String(t)}</li>);
    }
    return null;
  };

  return (
    <section className="grid gap-10 lg:grid-cols-2">
      {/* Gallery */}
      <div className="relative panel overflow-hidden p-0">
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
            alt={`${toStr(product.name) || "Product"} ${index + 1}`}
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
                className={`shrink-0 rounded border ${i === index ? "border-indigo-500" : "border-slate-700"} bg-slate-900`}
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
        <h1 className="text-3xl font-bold mb-1 text-white">{toStr(product.name) || "Product"}</h1>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {toStr(product.brand) && <p className="text-slate-300">{toStr(product.brand)}</p>}
          {toStr((product as any).category) && (
            <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200">
              {toStr((product as any).category)}
            </span>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">
              {formatCurrency(priceToUse)}
            </p>
            <span className="hidden sm:inline text-slate-400 line-through">
              {hasSale ? formatCurrency(price) : ""}
            </span>
          </div>
          {hasSale && (
            <div className="sm:hidden text-slate-400 line-through">
              {formatCurrency(price)}
            </div>
          )}
        </div>

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

          <button
            type="button"
            className="btn-primary"
            disabled={outOfStock}
            onClick={handleAddToCart}
          >
            {outOfStock ? "Unavailable" : "Add to Cart"}
          </button>

          <Link href="/products" className="btn-secondary">
            Back to Products
          </Link>
        </div>
      </div>
    </section>
  );
}