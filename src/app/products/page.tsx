export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProducts, type Product } from "../../lib/products";
import ProductsClient from "../../components/ProductsClient";

/* ---------- search helpers ---------- */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* fuzzy: allow 1-char mismatch */
function fuzzyIncludes(hay: string, needle: string): boolean {
  if (hay.includes(needle)) return true;
  if (needle.length < 3) return false;

  for (let i = 0; i < hay.length - needle.length + 1; i++) {
    let mismatches = 0;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) {
        mismatches++;
        if (mismatches > 1) break;
      }
    }
    if (mismatches <= 1) return true;
  }
  return false;
}

/* ---------- synonyms / normalization ---------- */
const SYNONYMS: Record<string, string[]> = {
  "power bank": ["powerbank", "power-bank", "pwerbank", "power bnk"],
  charger: ["adaptor", "adapter", "wall charger", "gan"],
  cable: ["usb-c", "type c", "lightning", "micro usb", "usb a", "usb"],
  audio: ["earbud", "earbuds", "headphone", "headset", "speaker"],
};

function variantsFor(token: string): string[] {
  const t = token.toLowerCase();
  for (const [key, alts] of Object.entries(SYNONYMS)) {
    if (t === key || alts.includes(t)) {
      return [key, ...alts];
    }
  }
  return [t];
}

/* ---------- matching (fixed) ---------- */
function matches(product: Product, q: string) {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const haystacks: string[] = [
    product.name ?? "",
    product.brand ?? "",
    (product as any).category ?? "",
    Array.isArray(product.specs)
      ? (product.specs as unknown as string[]).join(" ")
      : Object.values(product.specs ?? {}).join(" "),
  ]
    .map((s) => String(s).toLowerCase())
    .filter(Boolean);

  // ✅ For EACH token, match if ANY of its variants hit
  return tokens.every((original) => {
    const variants = variantsFor(original);
    return variants.some((t) => {
      const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
      return haystacks.some((h) => re.test(h) || fuzzyIncludes(h, t));
    });
  });
}

/* ---------- sort helpers ---------- */
function sortProducts(a: Product, b: Product) {
  const aIn = (a.stock ?? 0) > 0;
  const bIn = (b.stock ?? 0) > 0;
  if (aIn !== bIn) return aIn ? -1 : 1; // in-stock first

  const aSale =
    typeof a.salePrice === "number" &&
    a.salePrice > 0 &&
    a.salePrice < a.price;
  const bSale =
    typeof b.salePrice === "number" &&
    b.salePrice > 0 &&
    b.salePrice < b.price;
  if (aSale !== bSale) return aSale ? -1 : 1; // sale first

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return bCreated - aCreated; // newest first

  return a.name.localeCompare(b.name); // stable fallback
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

function normalizeCategoryName(raw: string): string {
  const s = (raw || "").trim().toLowerCase();

  if (/power\s*-?\s*bank/.test(s)) return "power-banks";
  if (/(charger|adaptor|adapter|gan|wall\s*charger|car\s*charger)/.test(s))
    return "chargers";
  if (/(cable|usb|type\s*-?\s*c|lightning|micro\s*-?\s*usb)/.test(s))
    return "cables";
  if (/(backpack|bag|sleeve|pouch|case)/.test(s)) return "bags";
  if (/(earbud|headphone|headset|speaker|audio)/.test(s)) return "audio";

  const fallback = slugify(raw);
  return fallback || "others";
}

function inferCategory(p: Product): string {
  const explicit = String(
    ((p as any).category || (p as any).type || "")
  ).trim();
  if (explicit) return normalizeCategoryName(explicit);

  const hay = [String(p?.name ?? ""), String((p as any).slug ?? "")]
    .join(" ")
    .toLowerCase();
  return normalizeCategoryName(hay);
}

/* ---------- page ---------- */
type PageProps = { searchParams?: { q?: string; cat?: string } };

export default async function ProductsPage({ searchParams }: PageProps) {
  const all = await getProducts();

  const q = (searchParams?.q ?? "").trim();
  const cat = (searchParams?.cat ?? "").trim().toLowerCase();

  let filtered = all;

  if (q) {
    filtered = filtered.filter((p) => matches(p, q));
  }

  if (cat) {
    filtered = filtered.filter((p) => inferCategory(p) === cat);
  }

  filtered = filtered.slice().sort(sortProducts);

  return (
    <ProductsClient
      products={filtered}
      initialQuery={q}
      initialCat={cat || undefined}
    />
  );
}