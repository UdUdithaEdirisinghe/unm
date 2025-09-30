import Link from "next/link";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts, type Product } from "../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- Helpers ---------------- */

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

function isOnSale(p: Product) {
  const promoCode = Boolean((p as any).promoCode);
  const promoDiscount = safeNum((p as any).promoDiscount, 0) > 0;
  const discount = safeNum((p as any).discount, 0) > 0;
  return promoCode || promoDiscount || discount;
}

/* ---------- category helpers ---------- */
function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function prettyLabel(slug: string) {
  return (slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeCategoryName(raw: string): string {
  const s = (raw || "").trim().toLowerCase();

  if (/power\s*-?\s*bank/.test(s)) return "power-banks";
  if (/(charger|adaptor|adapter|gan|wall\s*charger|car\s*charger)/.test(s)) return "chargers";
  if (/(cable|usb|type\s*-?\s*c|lightning|micro\s*-?\s*usb)/.test(s)) return "cables";
  if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
  if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

  const fallback = slugify(raw);
  return fallback || "others";
}

function inferCategory(p: Product): string {
  const explicit = String(((p as any).category || (p as any).type || "")).trim();
  if (explicit) return normalizeCategoryName(explicit);

  const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")]
    .join(" ")
    .toLowerCase();
  return normalizeCategoryName(hay);
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

/* --------- MINIMAL FIX: safe wrapper around getProducts --------- */
async function safeList(): Promise<Product[]> {
  try {
    const rows = await getProducts();
    return Array.isArray(rows) ? rows : [];
  } catch (e: any) {
    console.error("[HomePage] getProducts failed:", e?.message || e);
    // Fail safe: return empty so the page still renders
    return [];
  }
}

/* ---------------- Page ---------------- */

export default async function HomePage() {
  // Use the safe wrapper instead of calling getProducts() directly
  const all = await safeList();

  const featured = pick(
    all,
    8,
    undefined,
    (a, b) =>
      (isInStock(b) as any) - (isInStock(a) as any) ||
      popularity(b) - popularity(a) ||
      ts(b) - ts(a)
  );

  const onSale = pick(
    all,
    8,
    (p) => isOnSale(p),
    (a, b) => (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
  );

  const categories: Record<string, Product[]> = {};
  for (const p of all) {
    const cat = inferCategory(p);
    (categories[cat] ??= []).push(p);
  }

  const label: Record<string, string> = {
    "power-banks": "Power Banks",
    chargers: "Chargers & Adapters",
    cables: "Cables",
    bags: "Bags & Sleeves",
    audio: "Audio",
    others: "Miscellaneous",
  };

  const preferredOrder = ["power-banks", "chargers", "cables", "bags", "audio", "others"];
  const present = Object.keys(categories);

  const orderedCats = [
    ...preferredOrder.filter((k) => k !== "others" && present.includes(k)),
    ...present.filter((k) => !preferredOrder.includes(k) && k !== "others"),
    ...(present.includes("others") ? ["others"] : []),
  ];

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
        {/* Equal-height grid items */}
        <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <div key={(p as any).id} className="h-full">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero (unchanged) */}
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

      {/* Featured */}
      <Section title="Featured" items={featured} href="/products" />

      {/* On Sale */}
      <Section title="On Sale" items={onSale} href="/products?onSale=true" />

      {/* Category rows */}
      {orderedCats.map((cat) => {
        const items = categories[cat] || [];
        if (items.length === 0) return null;
        items.sort(
          (a, b) =>
            (isInStock(b) as any) - (isInStock(a) as any) || ts(b) - ts(a)
        );
        return (
          <Section
            key={cat}
            title={label[cat] ?? prettyLabel(cat)}
            items={items.slice(0, 8)}
            href={`/products?cat=${encodeURIComponent(cat)}`}
          />
        );
      })}
    </div>
  );
}
