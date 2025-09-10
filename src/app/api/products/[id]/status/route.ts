// src/app/api/orders/[id]/status/route.ts
import { NextResponse } from "next/server";
import { readOrders, writeOrders, type OrderStatus } from "../../../../../lib/products";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

// PATCH { status: "pending" | "paid" | "shipped" | "completed" | "cancelled" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status } = await req.json() as { status: OrderStatus };
  if (!status || !["pending", "paid", "shipped", "completed", "cancelled"].includes(status)) {
    return j({ error: "Invalid status." }, 400);
  }

  const orders = await readOrders();
  const idx = orders.findIndex(o => o.id === params.id);
  if (idx < 0) return j({ error: "Order not found." }, 404);

  orders[idx].status = status;
  await writeOrders(orders);
  return j({ ok: true, order: orders[idx] });
}