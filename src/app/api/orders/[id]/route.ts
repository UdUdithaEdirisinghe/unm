import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

const mapOrder = (r: any) => ({
  id: r.id,
  createdAt: r.created_at,
  status: r.status,
  customer: r.customer,
  items: r.items,
  subtotal: Number(r.subtotal),
  shipping: Number(r.shipping),
  promoCode: r.promo_code ?? undefined,
  promoDiscount: r.promo_discount ?? undefined,
  freeShipping: !!r.free_shipping,
  total: Number(r.total),
  paymentMethod: r.payment_method,
  bankSlipName: r.bank_slip_name ?? undefined,
  bankSlipUrl: r.bank_slip_url ?? undefined,
});

/** GET /api/orders/:id */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = (await sql`select * from orders where id = ${params.id} limit 1`) as any[];
    if (!rows.length) return j({ error: "Not found" }, 404);
    return j(mapOrder(rows[0]));
  } catch (e: any) {
    return j({ error: e?.message || "Failed to read order" }, 500);
  }
}

/** PUT /api/orders/:id (update status) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json().catch(() => ({}));
    const status = String(data?.status ?? "");

    const allowed = ["pending", "paid", "shipped", "completed", "cancelled"];
    if (!allowed.includes(status)) return j({ error: "Invalid status." }, 400);

    const rows = (await sql`
      update orders set status = ${status}
      where id = ${params.id}
      returning *
    `) as any[];

    if (!rows.length) return j({ error: "Not found" }, 404);
    return j(mapOrder(rows[0]));
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update order" }, 500);
  }
}

/** DELETE /api/orders/:id (optional) */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const rows = (await sql`delete from orders where id = ${params.id} returning id`) as any[];
    if (!rows.length) return j({ error: "Not found" }, 404);
    return j({ ok: true, id: params.id });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete order" }, 500);
  }
}