// src/lib/products.ts
import { promises as fs } from "fs";
import path from "path";

/* -------------------- Products -------------------- */
export type Specs = { RAM?: string; Storage?: string } | string[];

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image: string;            // "/file.png" in /public OR full http(s) URL
  shortDesc?: string;
  brand?: string;
  specs?: Specs;
  stock?: number;           // default 0
};

const PRODUCTS_FILE = path.join(process.cwd(), "data", "products.json");

/* -------------------- Orders (kept for types) -------------------- */
export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";

export type OrderItem = {
  id: string;
  name: string;
  slug: string;
  price: number;   // unit price
  quantity: number;
};

export type Order = {
  id: string;
  createdAt: string; // ISO
  status: OrderStatus;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    postal?: string;
    phone?: string;
    notes?: string;
    shipToDifferent?: {
      name: string;
      phone: string;
      address: string;
      city: string;
      postal?: string;
    };
  };
  paymentMethod: "COD" | "BANK";
  bankSlipName?: string;
  bankSlipUrl?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  promoCode?: string;
  promoDiscount?: number;
  freeShipping?: boolean;
  total: number;
};

const ORDERS_FILE = path.join(process.cwd(), "data", "orders.json");

/* -------------------- Safe FS helpers -------------------- */
async function safeRead(file: string, fallback: string) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, fallback, "utf8");
    return fallback;
  }
}

/* -------------------- Product helpers (EXPORTS you need) -------------------- */
export async function readProducts(): Promise<Product[]> {
  const raw = await safeRead(PRODUCTS_FILE, "[]");
  return JSON.parse(raw) as Product[];
}

export async function writeProducts(products: Product[]) {
  await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8");
}

/** Convenience: used by pages */
export async function getProducts(): Promise<Product[]> {
  return readProducts();
}

export async function getProductBySlug(slug: string) {
  const all = await readProducts();
  return all.find((p) => p.slug === slug);
}

/* -------------------- Orders file helpers (if you use them elsewhere) -------------------- */
export async function readOrders(): Promise<Order[]> {
  const raw = await safeRead(ORDERS_FILE, "[]");
  return JSON.parse(raw) as Order[];
}
export async function writeOrders(orders: Order[]) {
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}