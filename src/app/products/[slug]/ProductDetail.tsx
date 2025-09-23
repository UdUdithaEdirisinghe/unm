"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useCart } from "../../../components/cart/CartProvider";
import type { Product } from "../../../lib/products";
import { formatCurrency } from "../../../lib/format";
import { toast } from "react-hot-toast";
import { marked } from "marked";
import DOMPurify from "dompurify";

export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  /* ---------------- Markdown (safe) ---------------- */
  const [renderedDesc, setRenderedDesc] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function render() {
      const src = product.shortDesc || "";

      // marked can be sync (string) or async (Promise<string>) depending on version/config.
      const res = (marked as any).parse ? (marked as any).parse(src) : (marked as any)(src);
      const html: string =
        typeof (res as any)?.then === "function" ? await (res as Promise<string>) : (res as string);

      if (alive) setRenderedDesc(DOMPurify.sanitize(html));
    }

    render().catch(() => setRenderedDesc("")); // fail-safe: no crash, just empty
    return () => {
      alive = false;
    };
  }, [product.shortDesc]);

  /* ---------------- Images ---------------- */
  const imgs = useMemo(() => {
    const arr = (product.images && product.images.length ? product.images : [product.image]).map(
      (s) => (s.startsWith("/") || /^https?:\/\//.test(s) ? s : `/${s}`)
    );
    return arr.length ? arr : ["/placeholder.png"];
  }, [product.images, product.image]);
  const [index, setIndex] = useState(0);

  /* ---------------- Pricing / stock ---------------- */
  const salePrice = product.salePrice;
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const hasSale = typeof salePrice === "number" && salePrice > 0 && salePrice < product.price;

  const priceToUse = hasSale ? (salePrice as number) : product.price;
  const discountPct =
    hasSale && salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : 0;

  /* ---------------- Cart ---------------- */
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

  /* ---------------- Specs list ---------------- */
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
    <div className="grid gap-8 lg:grid-cols-2 items-start">
      {/* ========== Gallery (sticky on desktop) ========== */}
      <aside className="relative overflow-hidden rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] lg:sticky lg:top-24 lg:self-start">
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
      </aside>

      {/* ========== Info column ========== */}
      <section>
        <h1 className="mb-1 text-3xl font-bold text-white">{product.name}</h1>

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
          {hasSale && <div className="sm:hidden text-slate-400 line-through">{formatCurrency(product.price)}</div>}
        </div>

        {/* Overview (Markdown) */}
        {renderedDesc && (
          <>
            <h3 className="mb-2 font-semibold text-white">Overview</h3>
            <div className="mb-6 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderedDesc }} />
          </>
        )}

        <h3 className="mb-2 font-semibold text-white">Specifications</h3>
        <ul className="mb-6 list-disc pl-5 text-slate-300">{renderSpecs()}</ul>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800">
            <button
              type="button"
              className="h-9 w-9 border-r border-slate-700 text-white"
              onClick={() => setQty((n) => Math.max(1, n - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="px-3 tabular-nums text-white">{qty}</span>
            <button
              type="button"
              className="h-9 w-9 border-l border-slate-700 text-white"
              onClick={() => setQty((n) => n + 1)}
              aria-label="Increase quantity"
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
      </section>
    </div>
  );
}