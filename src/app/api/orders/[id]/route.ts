import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/orders/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = (await sql`
      select id, created_at, status, customer, items,
             subtotal, shipping, promo_code, promo_discount, free_shipping,
             total, payment_method, bank_slip_name, bank_slip_url
      from orders where id = ${params.id} limit 1
    `) as any[];
    if (rows.length === 0) return j({ error: "Not found" }, 404);
    return j(rows[0]);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to read order." }, 500);
  }
}

/* PUT /api/orders/:id  (update status) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status || "");

    const allowed = ["pending", "paid", "shipped", "completed", "cancelled"];
    if (!allowed.includes(status)) return j({ error: "Invalid status." }, 400);

    const res = (await sql`
      update orders set status = ${status} where id = ${params.id} returning *
    `) as any[];

    if (res.length === 0) return j({ error: "Not found" }, 404);
    return j(res[0]);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update order." }, 500);
  }
}

/* DELETE /api/orders/:id (optional) */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const r = (await sql`
      with del as (delete from orders where id = ${params.id} returning 1)
      select count(*)::int as count from del
    `) as { count: number }[];
    if ((r[0]?.count ?? 0) === 0) return j({ error: "Not found" }, 404);
    return j({ ok: true, id: params.id });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete order." }, 500);
  }
}