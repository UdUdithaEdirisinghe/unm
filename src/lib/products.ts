// src/lib/products.ts
import sql, { toJson } from "./db";

/* ========= Types ========= */

export type Product = {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  salePrice?: number | null;
  shortDesc?: string | null;
  brand?: string | null;
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

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";

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

/* ========= Mappers ========= */

function rowToProduct(r: any): Product {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    image: String(r.image),
    price: Number(r.price),
    salePrice: r.sale_price === null ? null : Number(r.sale_price),
    shortDesc: r.short_desc ?? null,
    brand: r.brand ?? null,
    specs: r.specs || null,
    stock: Number(r.stock ?? 0),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  };
}

/* ========= Product queries ========= */

export async function getProducts(): Promise<Product[]> {
  const rows = await sql`
    SELECT id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
    FROM products
    ORDER BY created_at DESC
  `;
  return rows.map(rowToProduct);
}

// alias to keep old imports working (e.g. sitemap that used readProducts)
export async function readProducts() {
  return getProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = await sql`
    SELECT id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
    FROM products
      WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function createProduct(p: Omit<Product, "id" | "createdAt">) {
  const id = `p_${Date.now()}`;
  const rows = await sql`
    INSERT INTO products
      (id, name, slug, image, price, sale_price, short_desc, brand, specs, stock)
    VALUES
      (
        ${id},
        ${p.name},
        ${p.slug},
        ${p.image},
        ${p.price},
        ${p.salePrice ?? null},
        ${p.shortDesc ?? null},
        ${p.brand ?? null},
        ${p.specs ? sql`${toJson(p.specs)}::jsonb` : null},
        ${p.stock ?? 0}
      )
    RETURNING id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
  `;
  return rowToProduct(rows[0]);
}

export async function updateProduct(id: string, patch: Partial<Product>) {
  // read existing
  const current = await sql`
    SELECT id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
    FROM products WHERE id = ${id} LIMIT 1
  `;
  if (!current[0]) return null;

  const prev = rowToProduct(current[0]);
  const next: Product = {
    ...prev,
    ...patch,
    salePrice: patch.salePrice === undefined ? prev.salePrice : patch.salePrice,
    shortDesc: patch.shortDesc === undefined ? prev.shortDesc : patch.shortDesc,
    brand: patch.brand === undefined ? prev.brand : patch.brand,
    specs: patch.specs === undefined ? prev.specs : patch.specs,
    stock: patch.stock === undefined ? prev.stock : patch.stock!,
  };

  const rows = await sql`
    UPDATE products SET
      name = ${next.name},
      slug = ${next.slug},
      image = ${next.image},
      price = ${next.price},
      sale_price = ${next.salePrice ?? null},
      short_desc = ${next.shortDesc ?? null},
      brand = ${next.brand ?? null},
      specs = ${next.specs ? sql`${toJson(next.specs)}::jsonb` : null},
      stock = ${next.stock}
    WHERE id = ${id}
    RETURNING id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
  `;
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function deleteProduct(id: string) {
  await sql`DELETE FROM products WHERE id = ${id}`;
  return true;
}