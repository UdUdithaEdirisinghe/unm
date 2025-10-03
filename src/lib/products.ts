// lib/products.ts
import sql, { toJson } from "./db";

export type Product = {
  id: string;
  name: string;
  slug: string;
  image: string;
  images?: string[];
  price: number;
  salePrice?: number | null;
  shortDesc?: string | null;     // <-- overview
  brand?: string | null;
  category?: string | null;
  specs?: Record<string, string> | null;
  stock: number;
  createdAt?: string;
  /** NEW */
  warranty?: string | null;
  /** NEW: Featured flag */
  featured?: boolean;
};

export type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
};

export type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    postal?: string;
    notes?: string;
    shipToDifferent?: {
      name?: string;
      phone?: string;
      address?: string;
      city?: string;
      postal?: string;
    };
  };
  paymentMethod: "COD" | "BANK";
  bankSlipName?: string | null;
  bankSlipUrl?: string | null;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  promoCode?: string | null;
  promoDiscount?: number | null;
  freeShipping: boolean;
  total: number;
  promoKind?: "promo" | "store_credit" | null;
};

function normalizeImages(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .map((s) => (s.startsWith("/") || /^https?:\/\//i.test(s) ? s : `/${s}`));
  }
  const s = String(input || "").trim();
  return s ? [(s.startsWith("/") || /^https?:\/\//i.test(s) ? s : `/${s}`)] : [];
}

function rowToProduct(r: any): Product {
  const imgs = normalizeImages(r.images);
  const primary = imgs[0] || String(r.image || "") || "/placeholder.png";
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    image: primary,
    images: imgs.length ? imgs : (primary ? [primary] : []),
    price: Number(r.price),
    salePrice: r.sale_price === null ? null : Number(r.sale_price),
    shortDesc: r.short_desc ?? null,
    brand: r.brand ?? null,
    category: r.category ?? null,
    specs: r.specs || null,
    stock: Number(r.stock ?? 0),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    /** NEW */
    warranty: r.warranty ?? null,
    /** NEW */
    featured: Boolean(r.featured),
  };
}

/* ----------------------------- READ ----------------------------- */

// Original: list all (kept for backward compatibility)
export async function getProducts(): Promise<Product[]> {
  const rows = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at, warranty, featured
    FROM products
    ORDER BY created_at DESC
  `;
  return rows.map(rowToProduct);
}

// New: filtered list for related section (safe dynamic pieces with template sql)
export async function getProductsByCategory(category: string, excludeId?: string, limit?: number) {
  const rows = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at, warranty, featured
    FROM products
    WHERE category = ${category}
    ${excludeId ? sql`AND id <> ${excludeId}` : sql``}
    ORDER BY created_at DESC
    ${limit && Number(limit) > 0 ? sql`LIMIT ${Number(limit)}` : sql``}
  `;
  return rows.map(rowToProduct);
}

/** NEW: featured-only list (random order for variety) */
export async function getFeaturedProducts(excludeId?: string, limit?: number) {
  const rows = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at, warranty, featured
    FROM products
    WHERE featured = true
    ${excludeId ? sql`AND id <> ${excludeId}` : sql``}
    ORDER BY random()
    ${limit && Number(limit) > 0 ? sql`LIMIT ${Number(limit)}` : sql``}
  `;
  return rows.map(rowToProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at, warranty, featured
    FROM products
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

/* ---------------------------- CREATE ---------------------------- */

export async function createProduct(p: Omit<Product, "id" | "createdAt" | "image">) {
  const id = `p_${Date.now()}`;
  const imgs = normalizeImages(p.images || []);
  const primary = imgs[0] || "/placeholder.png";

  const rows = await sql`
    INSERT INTO products
      (id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, warranty, featured)
    VALUES
      (
        ${id},
        ${p.name},
        ${p.slug},
        ${primary},
        ${sql`${toJson(imgs)}::jsonb`},
        ${p.price},
        ${p.salePrice ?? null},
        ${p.shortDesc ?? null},
        ${p.brand ?? null},
        ${p.category ?? null},
        ${p.specs ? sql`${toJson(p.specs)}::jsonb` : null},
        ${p.stock ?? 0},
        ${p.warranty ?? null},
        ${p.featured ?? false}
      )
    RETURNING id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at, warranty, featured
  `;
  return rowToProduct(rows[0]);
}

/* ---------------------------- UPDATE ---------------------------- */

export async function updateProduct(id: string, patch: Partial<Product>) {
  const current = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, warranty, featured
    FROM products WHERE id = ${id} LIMIT 1
  `;
  if (!current[0]) return null;

  const prev = rowToProduct(current[0]);
  const imgs = patch.images ? normalizeImages(patch.images) : prev.images || [];
  const primary = imgs[0] || prev.image;

  const next: Product = {
    ...prev,
    ...patch,
    image: primary,
    images: imgs,
    salePrice: patch.salePrice === undefined ? prev.salePrice : patch.salePrice,
    shortDesc: patch.shortDesc === undefined ? prev.shortDesc : patch.shortDesc,
    brand: patch.brand === undefined ? prev.brand : patch.brand,
    category: patch.category === undefined ? prev.category : patch.category,
    specs: patch.specs === undefined ? prev.specs : patch.specs,
    stock: patch.stock === undefined ? prev.stock : Number(patch.stock),
    price: patch.price === undefined ? prev.price : Number(patch.price),
    warranty: patch.warranty === undefined ? prev.warranty : (patch.warranty ?? null),
    featured: patch.featured === undefined ? prev.featured : Boolean(patch.featured),
  };

  const rows = await sql`
    UPDATE products SET
      name = ${next.name},
      slug = ${next.slug},
      image = ${next.image},
      images = ${sql`${toJson(next.images || [])}::jsonb`},
      price = ${next.price},
      sale_price = ${next.salePrice ?? null},
      short_desc = ${next.shortDesc ?? null},
      brand = ${next.brand ?? null},
      category = ${next.category ?? null},
      specs = ${next.specs ? sql`${toJson(next.specs)}::jsonb` : null},
      stock = ${next.stock},
      warranty = ${next.warranty ?? null},
      featured = ${next.featured ?? false}
    WHERE id = ${id}
    RETURNING id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at, warranty, featured
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

/* ---------------------------- DELETE ---------------------------- */

export async function deleteProduct(id: string) {
  await sql`DELETE FROM products WHERE id = ${id}`;
  return true;
}
