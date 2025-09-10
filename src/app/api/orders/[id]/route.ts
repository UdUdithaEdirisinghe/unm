import { NextResponse } from "next/server";
import { readOrders, writeOrders, type OrderStatus } from "../../../../lib/products";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/orders/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const orders = await readOrders();
    const order = orders.find(o => o.id === params.id);
    if (!order) return j({ error: "Not found" }, 404);
    return j(order);
  } catch (e: any) {
    console.error("[orders/:id GET]", e);
    return j({ error: e?.message || "Failed to read order" }, 500);
  }
}

/** PUT /api/orders/:id — update status only */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const status = body?.status as OrderStatus | undefined;
    const allowed: OrderStatus[] = ["pending", "paid", "shipped", "completed", "cancelled"];
    if (!status || !allowed.includes(status)) return j({ error: "Invalid status." }, 400);

    const orders = await readOrders();
    const idx = orders.findIndex(o => o.id === params.id);
    if (idx < 0) return j({ error: "Not found" }, 404);

    orders[idx].status = status;
    await writeOrders(orders);
    return j(orders[idx]);
  } catch (e: any) {
    console.error("[orders/:id PUT]", e);
    return j({ error: e?.message || "Failed to update order" }, 500);
  }
}

/** DELETE /api/orders/:id (optional) */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const orders = await readOrders();
    const idx = orders.findIndex(o => o.id === params.id);
    if (idx < 0) return j({ error: "Not found" }, 404);
    const [removed] = orders.splice(idx, 1);
    await writeOrders(orders);
    return j({ ok: true, id: removed.id });
  } catch (e: any) {
    console.error("[orders/:id DELETE]", e);
    return j({ error: e?.message || "Failed to delete order" }, 500);
  }
}