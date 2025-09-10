// src/app/page.tsx
import Link from "next/link";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import { getProducts } from "../lib/products";

export default async function HomePage() {
  const all = await getProducts();
  const featured = all.slice(0, 8);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-2xl border border-slate-800/60 bg-[rgba(10,15,28,0.9)] px-4 py-10 sm:px-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Premium Tech. Fair Prices.
        </h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Laptops, audio, and phones curated for performance and value in Sri Lanka.
        </p>

        {/* client-side search; won’t clear cart */}
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