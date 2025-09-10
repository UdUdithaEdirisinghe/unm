// src/app/products/page.tsx
export const dynamic = "force-dynamic";

import ProductCard from "../../components/ProductCard";
import SearchBar from "../../components/SearchBar";
import { getProducts } from "../../lib/products";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(product: any, q: string) {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const haystacks: string[] = [
    product.name ?? "",
    product.brand ?? "",
    Array.isArray(product.specs)
      ? product.specs.join(" ")
      : Object.values(product.specs ?? {}).join(" "),
  ].map((s) => String(s).toLowerCase());

  // every token must match as a whole word in at least one field
  return tokens.every((t) => {
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
    return haystacks.some((h) => re.test(h));
  });
}

type PageProps = { searchParams?: { q?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();
  const q = (searchParams?.q ?? "").trim();
  const filtered = q ? all.filter((p) => matches(p, q)) : all;

  return (
    <div className="space-y-6">
      {/* Header + search (keeps your layout, aligns right on wide screens) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-white">Products</h1>

        {/* ✅ client-side search with URL sync */}
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