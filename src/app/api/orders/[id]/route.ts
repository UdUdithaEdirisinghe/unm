// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/orders/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const orders = await sql`
      select id, created_at, status, customer, payment_method, bank_slip_name, bank_slip_url,
             subtotal, shipping, promo_code, promo_discount, free_shipping, total
      from orders where id = ${params.id} limit 1
    `;
    if (!orders.length) return j({ error: "Not found" }, 404);

    const o: any = orders[0];
    const items = await sql`
      select product_id, slug, name, price, quantity
      from order_items where order_id = ${params.id}
      order by created_at asc
    `;

    return j({
      id: o.id,
      createdAt: o.created_at,
      status: o.status,
      customer: o.customer,
      paymentMethod: o.payment_method,
      bankSlipName: o.bank_slip_name ?? undefined,
      bankSlipUrl: o.bank_slip_url ?? undefined,
      items: items.map((it: any) => ({
        id: it.product_id,
        slug: it.slug,
        name: it.name,
        price: Number(it.price),
        quantity: Number(it.quantity),
      })),
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      promoCode: o.promo_code ?? undefined,
      promoDiscount: o.promo_discount ?? undefined,
      freeShipping: !!o.free_shipping,
      total: Number(o.total),
    });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to read order." }, 500);
  }
}

/* PUT /api/orders/:id — update status only */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const status = body?.status as
      | "pending"
      | "paid"
      | "shipped"
      | "completed"
      | "cancelled"
      | undefined;

    if (!status) return j({ error: "Invalid status." }, 400);

    const upd = await sql`
      update orders set status = ${status} where id = ${params.id}
      returning id
    `;
    if (!upd.length) return j({ error: "Not found" }, 404);

    // return fresh order
    const res = await GET({} as any, { params });
    return res;
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update order." }, 500);
  }
}

/* DELETE /api/orders/:id */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const del = await sql`delete from orders where id = ${params.id} returning id`;
    if (!del.length) return j({ error: "Not found" }, 404);
    // order_items have FK ON DELETE CASCADE (per your earlier schema)
    return j({ ok: true, id: del[0].id });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete order." }, 500);
  }
}
