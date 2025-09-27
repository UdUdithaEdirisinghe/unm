export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";
import {
  normalizeCategoryName,
  inferCategory,
  matches,
  sortProducts,
  safeStr,
} from "../../lib/catalog";

type PageProps = { searchParams?: { q?: string; cat?: string; brand?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  // Normalise incoming params (tolerant to Power Bank / power-bank / Adapters…)
  const q = safeStr(searchParams?.q ?? "");
  const catSlug = normalizeCategoryName(safeStr(searchParams?.cat ?? ""));
  const brand = safeStr(searchParams?.brand ?? "").toLowerCase();

  let filtered = all.slice();

  if (q) filtered = filtered.filter((p) => matches(p, q));

  if (catSlug) {
    filtered = filtered.filter((p) => {
      const inferred = inferCategory(p); // normalised
      const raw = normalizeCategoryName(safeStr((p as any).category));
      return inferred === catSlug || raw === catSlug;
    });
  }

  if (brand) {
    filtered = filtered.filter((p) => safeStr(p.brand).toLowerCase() === brand);
  }

  filtered.sort(sortProducts);

  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={catSlug || undefined}
      initialBrand={brand || undefined}
    />
  );
}