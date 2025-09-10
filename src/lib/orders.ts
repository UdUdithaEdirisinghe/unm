import { promises as fs } from "fs";
import path from "path";

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  createdAt: string; // ISO
  customer?: { name?: string; email?: string; address?: string };
};

const ORDERS_FILE = path.join(process.cwd(), "data", "orders.json");

export async function readOrders(): Promise<Order[]> {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

export async function writeOrders(orders: Order[]) {
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}