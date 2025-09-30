"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useCart } from "../../../components/cart/CartProvider";
import ProductCard from "../../../components/ProductCard";
import type { Product } from "../../../lib/products";
import { formatCurrency } from "../../../lib/format";
import { toast } from "react-hot-toast";
import { marked } from "marked";
import DOMPurify from "dompurify";

export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  /* ---------- Markdown (safe) ---------- */
  const [renderedDesc, setRenderedDesc] = useState<string>("");

  useEffect(() => {
    let alive = true;
    async function render() {
      const src = product.shortDesc || "";
      const res = (marked as any).parse ? (marked as any).parse(src) : (marked as any)(src);
      const html: string =
        typeof (res as any)?.then === "function" ? await (res as Promise<string>) : (res as string);
      if (alive) setRenderedDesc(DOMPurify.sanitize(html));
    }
    render().catch(() => setRenderedDesc(""));
    return () => {
      alive = false;
    };
  }, [product.shortDesc]);

  /* ---------- Images ---------- */
  const imgs = useMemo(() => {
    const arr = (product.images && product.images.length ? product.images : [product.image]).map(
      (s) => (s.startsWith("/") || /^https?:\/\//.test(s) ? s : `/${s}`)
    );
    return arr.length ? arr : ["/placeholder.png"];
  }, [product.images, product.image]);

  // Carousel state
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ startX: 0, deltaX: 0, isDragging: false });

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const go = (to: number) => setIndex((i) => clamp(to, 0, imgs.length - 1));
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  function start(x: number) {
    setDrag({ startX: x, deltaX: 0, isDragging: true });
  }
  function move(x: number) {
    setDrag((d) => (d.isDragging ? { ...d, deltaX: x - d.startX } : d));
  }
  function end() {
    setDrag((d) => {
      if (!d.isDragging) return d;
      const threshold = 60;
      if (d.deltaX < -threshold) next();
      else if (d.deltaX > threshold) prev();
      return { startX: 0, deltaX: 0, isDragging: false };
    });
  }
  function onKey(e: any) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }

  /* ---------- Pricing / stock ---------- */
  const salePrice = product.salePrice ?? null;
  const stock = product.stock ?? 0;
  const outOfStock = stock <= 0;
  const hasSale =
    typeof salePrice === "number" && salePrice > 0 && (salePrice as number) < product.price;

  const priceToUse = hasSale ? (salePrice as number) : product.price;
  const discountPct =
    hasSale && salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : 0;

  /* ---------- Cart ---------- */
  const handleAddToCart = () => {
    add({ id: product.id, name: product.name, price: priceToUse, image: imgs[0], slug: product.slug }, qty);
    toast.success(`${product.name} added to cart!`);
  };

  /* ---------- Related ---------- */
  const [related, setRelated] = useState<Product[]>([]);
  useEffect(() => {
    const cat = (product as any).category?.toString().trim();
    if (!cat) return;
    const url = `/api/products?category=${encodeURIComponent(cat)}&limit=12&exclude=${encodeURIComponent(
      product.id
    )}`;
    fetch(url)
      .then((r) => r.json())
      .then((arr: Product[]) => Array.isArray(arr) && setRelated(arr.slice(0, 8)))
      .catch(() => {});
  }, [product.id, (product as any).category]);

  /* ---------- Specs ---------- */
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
    if (Array.isArray(s)) return s.map((t: string, i: number) => <li key={i}>{t}</li>);
    return null;
  };

  return (
    <>
      {/* ===== Top: gallery + info ===== */}
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* ===== Gallery / Carousel ===== */}
        <aside
          className="relative overflow-hidden rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.35)] lg:sticky lg:top-24 lg:self-start select-none"
          tabIndex={0}
          onKeyDown={onKey}
        >
          {/* badges */}
          <div className="absolute top-3 left-3 z-30 flex flex-col gap-2">
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

          {/* IMAGE TRACK + ARROW OVERLAY */}
          <div className="relative">
            {/* track */}
            <div
              onTouchStart={(e) => start(e.touches[0].clientX)}
              onTouchMove={(e) => move(e.touches[0].clientX)}
              onTouchEnd={end}
              onMouseDown={(e) => {
                e.preventDefault();
                start(e.clientX);
              }}
              onMouseMove={(e) => drag.isDragging && move(e.clientX)}
              onMouseUp={end}
              onMouseLeave={end}
            >
              <div
                className={`flex transition-transform duration-300 ease-out ${
                  drag.isDragging ? "!duration-0" : ""
                }`}
                style={{
                  transform: `translateX(calc(-${index * 100}% + ${drag.isDragging ? drag.deltaX : 0}px))`,
                }}
              >
                {imgs.map((src, i) => (
                  <div key={i} style={{ flex: "0 0 100%" }} className="shrink-0">
                    {/* responsive frame; image fills + crops */}
                    <div className="relative w-full h-[360px] sm:h-[420px] md:h-[520px] lg:h-[560px] 2xl:h-[620px] bg-slate-900">
                      <Image
                        src={src}
                        alt={`${product.name} ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 800px"
                        className="object-cover object-center"
                        priority={i === 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* centered arrows */}
            {imgs.length > 1 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 sm:px-3">
                <button
                  aria-label="Previous image"
                  onClick={prev}
                  className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 ring-1 ring-slate-300/80 shadow-md hover:bg-white active:scale-95 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" className="text-slate-900">
                    <path fill="currentColor" d="M15.41 7.41L14 6l-6 6l6 6l1.41-1.41L10.83 12z" />
                  </svg>
                </button>
                <button
                  aria-label="Next image"
                  onClick={next}
                  className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 ring-1 ring-slate-300/80 shadow-md hover:bg-white active:scale-95 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" className="text-slate-900">
                    <path fill="currentColor" d="m10 6l-1.41 1.41L13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* DOTS */}
          {imgs.length > 1 && (
            <div className="flex items-center justify-center gap-2 py-3">
              {imgs.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === index ? "bg-slate-200" : "bg-slate-600/60 hover:bg-slate-500"
                  }`}
                />
              ))}
            </div>
          )}

          {/* THUMBS */}
          {imgs.length > 1 && (
            <div className="flex gap-3 p-3 overflow-x-auto border-t border-slate-800/60 bg-[rgba(10,15,28,0.4)]">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`shrink-0 rounded-xl border transition ${
                    i === index ? "border-indigo-500 shadow" : "border-slate-700 hover:border-slate-500"
                  } bg-slate-900/40`}
                  aria-label={`Thumbnail ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`thumb-${i}`} className="h-20 w-24 object-cover rounded-xl" />
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ===== Info ===== */}
        <section>
          <h1 className="mb-1 text-3xl font-bold text-white">{product.name}</h1>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {product.brand && <p className="text-slate-300">{product.brand}</p>}
            {(product as any).category && (
              <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200">
                {(product as any).category}
              </span>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{formatCurrency(priceToUse)}</p>
              <span className="hidden sm:inline text-slate-400 line-through">
                {hasSale ? formatCurrency(product.price) : ""}
              </span>
            </div>
            {hasSale && (
              <div className="sm:hidden text-slate-400 line-through">{formatCurrency(product.price)}</div>
            )}
          </div>

          {/* badges */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(product as any).warranty && (
              <span className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-xs text-slate-200">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2l7 4v6c0 5-3.8 9.7-7 10c-3.2-.3-7-5-7-10V6l7-4zm0 4.2L7 7.7v4.7c0 3.7 2.5 7.5 5 8c2.5-.5 5-4.3 5-8V7.7l-5-1.5zm-1 9.3l-3-3l1.4-1.4l1.6 1.6l3.6-3.6L16 9.7L11 15.5z"
                  />
                </svg>
                {(product as any).warranty}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-xs text-slate-200">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M20 8h-3.17l-1.84-2.76A2 2 0 0 0 13.36 4H10.6a2 2 0 0 0-1.63.84L7.17 8H4a2 2 0 0 0-2 2v7a1 1 0 0 0 1 1h3v-2H4v-5h16v5h-2v2h3a1 1 0 0 0 1-1v-7a2 2 0 0 0-2-2ZM9.85 6h4.31l1.33 2H8.52ZM8 21h2v-2h4v2h2v-4H8Z"
                />
              </svg>
              Island-wide Delivery 1–3 working days
            </span>
          </div>

          <h3 className="mb-2 font-semibold text-white">Specifications</h3>
          <ul className="mb-4 list-disc pl-5 text-slate-300">{renderSpecs()}</ul>

          {/* CTAs */}
          <div className="mb-6 flex items-center gap-3">
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

      {/* ===== Full-width Description ===== */}
      {renderedDesc && (
        <section className="mt-8 rounded-lg border border-slate-800/60 bg-[rgba(10,15,28,0.4)] p-4 sm:p-6">
          <div className="mb-4">
            <div className="text-xl font-semibold text-white">Description</div>
            <div className="mt-1 h-[3px] w-28 rounded bg-white/80" />
          </div>
          <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">{product.name}</h2>
          <div
            className="prose prose-invert prose-lg max-w-none leading-relaxed prose-headings:font-semibold prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: renderedDesc }}
          />
        </section>
      )}

      {/* ===== You may also be interested in... ===== */}
      {related.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-3 text-lg font-semibold text-white">You may also be interested in...</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
