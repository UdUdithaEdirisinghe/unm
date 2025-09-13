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

/** Popularity score with safe fallbacks */
function popularity(p: Product) {
  const v = safeNum((p as any).views ?? (p as any).sold ?? (p as any).popularity, 0);
  if (v > 0) return v;
  // Stable fallback by id so order doesn’t jump: last 6 digits as number
  const id = String((p as any).id ?? "");
  const tail = id.slice(-6).replace(/\D/g, "");
  return safeNum(tail, 0);
}

/** Infer category if not present (non-destructive; your DB stays the same) */
function inferCategory(p: Product): string {
  const explicit = String(((p as any).category || (p as any).type || "")).trim().toLowerCase();
  if (explicit) return explicit;

  const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")]
    .join(" ")
    .toLowerCase();

  if (/\b(power ?bank|powerbank)\b/.test(hay)) return "power-banks";
  if (/\b(cable|type[- ]?c|usb[- ]?c|lightning|micro[- ]?usb)\b/.test(hay)) return "cables";
  if (/\b(charger|adapter|gan|wall charger|car charger)\b/.test(hay)) return "chargers";
  if (/\b(backpack|bag|sleeve|pouch|case)\b/.test(hay)) return "bags";
  if (/\b(earbud|headphone|headset|speaker|audio)\b/.test(hay)) return "audio";
  return "others";
}

/** Is product on sale? (promo code or discount field) */
function isOnSale(p: Product) {
  const promoCode = Boolean((p as any).promoCode);
  const promoDiscount = safeNum((p as any).promoDiscount, 0) > 0;
  const discount = safeNum((p as any).discount, 0) > 0; // if you store % off
  return promoCode || promoDiscount || discount;
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
  return n > 0 ? arr.slice(0, n) : arr;
}

/* ----------------------------- Page ------------------------------ */

export default async function HomePage() {
  const all = await getProducts();

  // Featured = Most Visited (in-stock first → popularity → newest)
  const featured = pick(
    all,
    8,
    undefined,
    (a, b) =>
      (isInStock(b) as any) - (isInStock(a) as any) ||
      popularity(b) - popularity(a) ||
      ts(b) - ts(a)
  );

  // On Sale (promo/discount), in-stock first, newest next
  const onSale = pick(
    all,
    8,
    (p) => isOnSale(p),
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  // Group products by category
  const categories: Record<string, Product[]> = {};
  for (const p of all) {
    const cat = inferCategory(p);
    (categories[cat] ??= []).push(p);
  }

  // Pretty names for UI
  const categoryNames: Record<string, string> = {
    "power-banks": "Power Banks",
    chargers: "Chargers & Adapters",
    cables: "Cables",
    bags: "Bags & Sleeves",
    audio: "Audio",
    others: "Miscellaneous",
  };

  // Deterministic render order (others at the end, only once)
  const orderedCats = ["power-banks", "chargers", "cables", "bags", "audio", "others"];

  // Section UI (keeps your colors/spacing)
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

      {/* Featured (Most Visited) */}
      <Section title="Featured" items={featured} href="/products" />

      {/* On Sale */}
      <Section title="On Sale" items={onSale} href="/products?onSale=true" />

      {/* Category rows */}
      {orderedCats.map((cat) => {
        const items = categories[cat] || [];
        if (items.length === 0) return null;

        // sort: in-stock first, then newest
        items.sort(
          (a, b) =>
            (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
        );

        return (
          <Section
            key={cat}
            title={categoryNames[cat] ?? cat}
            items={items.slice(0, 8)}
            href={`/products?cat=${encodeURIComponent(cat)}`}
          />
        );
      })}
    </div>
  );
}