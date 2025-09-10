// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/orders/:id */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await sql/*sql*/`
      select id, created_at, status, customer, items, subtotal, shipping,
             promo_code, promo_discount, free_shipping, total,
             payment_method, bank_slip_name, bank_slip_url
      from orders
      where id = ${params.id}
      limit 1
    `;
    if (rows.length === 0) return j({ error: "Not found" }, 404);

    const r = rows[0] as any;
    const order = {
      id: r.id,
      createdAt: r.created_at.toISOString?.() ?? r.created_at,
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
    };
    return j(order);
  } catch (e: any) {
    return j({ error: e?.message || "Read failed." }, 500);
  }
}

/** PUT /api/orders/:id  (update status only) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await req.json();
    const allowed = ["pending", "paid", "shipped", "completed", "cancelled"];
    if (!allowed.includes(status)) return j({ error: "Invalid status." }, 400);

    const res = await sql/*sql*/`
      update orders set status = ${status}
      where id = ${params.id}
    `;
    if ((res as any).rowCount === 0) return j({ error: "Not found" }, 404);

    // return updated order
    const rows = await sql/*sql*/`
      select id, created_at, status, customer, items, subtotal, shipping,
             promo_code, promo_discount, free_shipping, total,
             payment_method, bank_slip_name, bank_slip_url
      from orders where id = ${params.id} limit 1
    `;
    const r = rows[0] as any;
    const order = {
      id: r.id,
      createdAt: r.created_at.toISOString?.() ?? r.created_at,
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
    };
    return j(order);
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

/** DELETE /api/orders/:id (optional) */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await sql/*sql*/`delete from orders where id = ${params.id}`;
    if ((res as any).rowCount === 0) return j({ error: "Not found" }, 404);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}