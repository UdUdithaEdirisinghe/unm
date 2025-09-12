// src/app/page.tsx
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts, type Product } from "../lib/products";

/** no caching: always read fresh product stock */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** robust date parse for sorting */
function ts(p: Product) {
  const d = p.createdAt ? new Date(p.createdAt) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}

export default async function HomePage() {
  const all = await getProducts();

  // 1) In-stock first, 2) newest first. OOS go to the bottom.
  const sorted = [...all].sort((a, b) => {
    const aIn = (a.stock ?? 0) > 0 ? 1 : 0;
    const bIn = (b.stock ?? 0) > 0 ? 1 : 0;
    if (aIn !== bIn) return bIn - aIn;           // in-stock above out-of-stock
    return ts(b) - ts(a);                         // newer above older
  });

  const featured = sorted.slice(0, 8);

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

        {/* client-side search; keeps cart intact */}
        <SearchBar
          placeholder="Search power banks, earbuds, chargers…"
          className="mt-6 max-w-xl"
        />
      </section>

      {/* Featured */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Featured</h2>
          <Link href="/products" className="text-sm text-brand-accent hover:underline">
            View all →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}