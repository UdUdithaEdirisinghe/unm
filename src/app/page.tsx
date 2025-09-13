// src/app/page.tsx
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts, type Product } from "../lib/products";

/** Always read fresh product stock/prices for homepage */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- Helpers (local, no other files touched) --------------- */

const safeNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isInStock = (p: Product) => safeNum((p as any).stock, 0) > 0;

function ts(p: Product) {
  const d = p?.createdAt ? new Date(p.createdAt) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}

/** Very light popularity score with safe fallbacks */
function popularity(p: Product) {
  const v = safeNum((p as any).views ?? (p as any).sold ?? (p as any).popularity, 0);
  if (v > 0) return v;
  // stable fallback by id so order doesn’t jump: last 6 digits as number
  const id = String((p as any).id ?? "");
  const tail = id.slice(-6).replace(/\D/g, "");
  return safeNum(tail, 0);
}

/** Map product to a canonical storefront category without changing your DB.
 * If your Product already has category, we use it; otherwise we infer from the name/slug.
 */
function inferCategory(p: Product): string {
  const raw = String(((p as any).category || (p as any).type || p?.name || "")).toLowerCase();

  // Prefer explicit category if present
  if ((p as any).category) return raw;

  // Infer from name/slug keywords
  const hay = [raw, String(p?.name ?? ""), String((p as any).slug ?? "")].join(" ").toLowerCase();

  if (/\b(power ?bank|powerbank)\b/.test(hay)) return "power-banks";
  if (/\b(cable|type[- ]?c|usb[- ]?c|lightning|micro[- ]?usb)\b/.test(hay)) return "cables";
  if (/\b(charger|adapter|gan|wall charger|car charger)\b/.test(hay)) return "chargers";
  if (/\b(backpack|bag|sleeve|pouch|case)\b/.test(hay)) return "bags";
  if (/\b(earbud|headphone|headset|speaker|audio)\b/.test(hay)) return "audio";
  return "others";
}

/** Utility: pick n items with optional filter + sort */
function pick(
  products: Product[],
  n: number,
  filter?: (p: Product) => boolean,
  sort?: (a: Product, b: Product) => number
) {
  const arr = filter ? products.filter(filter) : [...products];
  if (sort) arr.sort(sort);
  return arr.slice(0, n);
}

/* ----------------------------- Page ------------------------------ */

export default async function HomePage() {
  const all = await getProducts();

  // Keep your “Featured” feel but make it newest in-stock
  const featured = pick(
    all,
    8,
    (p) => isInStock(p),
    (a, b) => ts(b) - ts(a) // newest first
  );

  // Category rows (you can re-order or hide any section)
  const powerBanks = pick(
    all,
    8,
    (p) => inferCategory(p) === "power-banks",
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  const chargers = pick(
    all,
    8,
    (p) => inferCategory(p) === "chargers",
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  const cables = pick(
    all,
    8,
    (p) => inferCategory(p) === "cables",
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  const bags = pick(
    all,
    8,
    (p) => inferCategory(p) === "bags",
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  // “Most Visited” (popularity/sold/views) with safe fallback
  const mostVisited = pick(
    all,
    8,
    undefined,
    (a, b) => popularity(b) - popularity(a)
  );

  // “New Arrivals”
  const newArrivals = pick(
    all,
    8,
    undefined,
    (a, b) => ts(b) - ts(a)
  );

  // Helper: section UI (keeps your colors/spacing)
  function Section({
    title,
    href = "/products",
    items,
  }: {
    title: string;
    href?: string;
    items: Product[];
  }) {
    if (!items || items.length === 0) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <Link href={href} className="text-sm text-brand-accent hover:underline">
            See all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={(p as any).id} product={p} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-4 py-10 sm:px-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Tech for everybody.
        </h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Laptops, audio and mobile accessories across every budget. Clear specs,
          fair pricing, local support.
        </p>
        <SearchBar
          placeholder="Search power banks, earbuds, chargers…"
          className="mt-6 max-w-xl"
        />
      </section>

      {/* Featured (kept from your layout: newest in-stock) */}
      <Section title="Featured" items={featured} href="/products" />

      {/* Most Visited / Popular */}
      <Section title="Most Visited" items={mostVisited} href="/products" />

      {/* New Arrivals */}
      <Section title="New Arrivals" items={newArrivals} href="/products" />

      {/* Category rows (Power Banks, Chargers, Cables, Bags) */}
      <Section title="Power Banks" items={powerBanks} href="/products?cat=power-banks" />
      <Section title="Chargers & Adapters" items={chargers} href="/products?cat=chargers" />
      <Section title="Cables" items={cables} href="/products?cat=cables" />
      <Section title="Bags & Sleeves" items={bags} href="/products?cat=bags" />
    </div>
  );
}