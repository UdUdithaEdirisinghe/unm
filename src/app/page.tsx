// src/app/page.tsx
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts, type Product } from "../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const safeNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isInStock = (p: Product) => safeNum((p as any).stock, 0) > 0;

function ts(p: Product) {
  const d = p?.createdAt ? new Date(p.createdAt) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}

function popularity(p: Product) {
  const v = safeNum((p as any).views ?? (p as any).sold ?? (p as any).popularity, 0);
  if (v > 0) return v;
  const id = String((p as any).id ?? "");
  const tail = id.slice(-6).replace(/\D/g, "");
  return safeNum(tail, 0);
}

function inferCategory(p: Product): string {
  const raw = String(((p as any).category || (p as any).type || p?.name || "")).toLowerCase();
  if ((p as any).category) return raw;

  const hay = [raw, String(p?.name ?? ""), String((p as any).slug ?? "")].join(" ").toLowerCase();
  if (/\b(power ?bank|powerbank)\b/.test(hay)) return "power-banks";
  if (/\b(cable|type[- ]?c|usb[- ]?c|lightning|micro[- ]?usb)\b/.test(hay)) return "cables";
  if (/\b(charger|adapter|gan|wall charger|car charger)\b/.test(hay)) return "chargers";
  if (/\b(backpack|bag|sleeve|pouch|case)\b/.test(hay)) return "bags";
  if (/\b(earbud|headphone|headset|speaker|audio)\b/.test(hay)) return "audio";
  return "others";
}

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

export default async function HomePage() {
  const all = await getProducts();

  // Featured = most visited/popular (in-stock first)
  const featured = pick(
    all,
    8,
    undefined,
    (a, b) =>
      (isInStock(b) as any) - (isInStock(a) as any) ||
      popularity(b) - popularity(a) ||
      ts(b) - ts(a)
  );

  // On Sale = promo or discount
  const onSale = pick(
    all,
    8,
    (p) => safeNum((p as any).promoDiscount, 0) > 0 || Boolean((p as any).promoCode),
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  // Group products by category
  const categories: Record<string, Product[]> = {};
  for (const p of all) {
    const cat = inferCategory(p);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  }

  // Section UI
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

      {/* Featured (most visited) */}
      <Section title="Featured" items={featured} href="/products" />

      {/* On Sale */}
      <Section title="On Sale" items={onSale} href="/products?onSale=true" />

      {/* Category rows */}
      {Object.entries(categories).map(([cat, items]) => {
        // sort: in-stock first, newest first
        items.sort(
          (a, b) =>
            (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
        );
        const title =
          cat === "power-banks"
            ? "Power Banks"
            : cat === "chargers"
            ? "Chargers & Adapters"
            : cat === "cables"
            ? "Cables"
            : cat === "bags"
            ? "Bags & Sleeves"
            : cat === "audio"
            ? "Audio"
            : "Others";

        return (
          <Section
            key={cat}
            title={title}
            items={items.slice(0, 8)}
            href={`/products?cat=${cat}`}
          />
        );
      })}
    </div>
  );
}