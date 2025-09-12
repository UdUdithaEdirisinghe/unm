// src/app/products/page.tsx
export const dynamic = "force-dynamic";

import ProductCard from "../../components/ProductCard";
import SearchBar from "../../components/SearchBar";
import { getProducts } from "../../lib/products";
import type { Product } from "../../lib/products";

/* ---------- search helpers ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(product: Product, q: string) {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const haystacks: string[] = [
    product.name ?? "",
    product.brand ?? "",
    Array.isArray(product.specs)
      ? (product.specs as unknown as string[]).join(" ")
      : Object.values(product.specs ?? {}).join(" "),
  ].map((s) => String(s).toLowerCase());

  // every token must match as a whole word in at least one field
  return tokens.every((t) => {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
    return haystacks.some((h) => re.test(h));
  });
}

/* ---------- sort helpers (same idea as homepage) ---------- */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1;                       // in-stock first

  const aSale = typeof a.salePrice === "number" && a.salePrice > 0 && a.salePrice < a.price;
  const bSale = typeof b.salePrice === "number" && b.salePrice > 0 && b.salePrice < b.price;
  if (aSale !== bSale) return aSale ? -1 : 1;                  // sale first

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return bCreated - aCreated;       // newest first

  return a.name.localeCompare(b.name);                         // stable fallback
}

type PageProps = { searchParams?: { q?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  // apply search
  const q = (searchParams?.q ?? "").trim();
  const filtered = (q ? all.filter((p) => matches(p, q)) : all).slice();

  // apply ordering
  filtered.sort(sortProducts);

  return (
    <div className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-white">Products</h1>
        <SearchBar
          initial={q}
          placeholder="Search products…"
          className="w-full sm:max-w-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {q && filtered.length === 0 && (
        <p className="text-slate-400">No matches for “{q}”.</p>
      )}
    </div>
  );
}