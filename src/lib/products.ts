import sql, { toJson } from "./db";

/* ========= Types ========= */

export type Product = {
  id: string;
  name: string;
  slug: string;
  image: string;            // primary image (first)
  images?: string[];        // NEW: all images (first = primary)
  price: number;
  salePrice?: number | null;
  shortDesc?: string | null;
  brand?: string | null;
  category?: string | null;
  specs?: Record<string, string> | null;
  stock: number;
  createdAt?: string;
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
};

/* ========= Helpers ========= */

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

/* ========= Mappers ========= */

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
  };
}

/* ========= Product queries ========= */

export async function getProducts(): Promise<Product[]> {
  const rows = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at
    FROM products
    ORDER BY created_at DESC
  `;
  return rows.map(rowToProduct);
}

// alias for legacy imports
export async function readProducts() {
  return getProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at
    FROM products
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function createProduct(p: Omit<Product, "id" | "createdAt" | "image">) {
  const id = `p_${Date.now()}`;
  const imgs = normalizeImages(p.images || []);
  // keep legacy "image" column as the first image for compatibility
  const primary = imgs[0] || "/placeholder.png";

  const rows = await sql`
    INSERT INTO products
      (id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock)
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
        ${p.stock ?? 0}
      )
    RETURNING id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at
  `;
  return rowToProduct(rows[0]);
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  // read existing
  const current = await sql`
    SELECT id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock
    FROM products WHERE id = ${id} LIMIT 1
  `;
  if (!current[0]) return null;

  const prev = rowToProduct(current[0]);
  // normalize images if present
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
      stock = ${next.stock}
    WHERE id = ${id}
    RETURNING id, name, slug, image, images, price, sale_price, short_desc, brand, category, specs, stock, created_at
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function deleteProduct(id: string) {
  await sql`DELETE FROM products WHERE id = ${id}`;
  return true;
}