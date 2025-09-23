// Read & update order (status only)
import { NextResponse } from "next/server";
import sql from "../../../../lib/db";
import type { Order } from "../../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

function baseRowToOrder(r: any): Omit<Order, "promoKind"> {
  return {
    id: String(r.id),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    status: r.status,
    customer: r.customer || {
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      city: "",
    },
    items: Array.isArray(r.items) ? r.items : [],
    subtotal: Number(r.subtotal ?? 0),
    shipping: Number(r.shipping ?? 0),
    promoCode: r.promo_code ?? null,
    promoDiscount: r.promo_discount == null ? null : Number(r.promo_discount),
    freeShipping: Boolean(r.free_shipping),
    total: Number(r.total ?? 0),
    paymentMethod: (r.payment_method as Order["paymentMethod"]) ?? "COD",
    bankSlipName: r.bank_slip_name ?? null,
    bankSlipUrl: r.bank_slip_url ?? null,
  };
}

/** GET /api/orders/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows: any[] = await sql`SELECT * FROM orders WHERE id=${params.id} LIMIT 1`;
    if (!rows[0]) return j({ error: "Not found" }, 404);

    const base = baseRowToOrder(rows[0]);

    // Infer promoKind: if promo_code exists in store_credits -> store_credit, else promo (or null)
    let promoKind: Order["promoKind"] = null;
    if (base.promoCode) {
      const scRows: any[] = await sql`
        SELECT 1 FROM store_credits WHERE LOWER(code) = LOWER(${base.promoCode}) LIMIT 1
      `;
      promoKind = scRows[0] ? "store_credit" : "promo";
    }

    return j({ ...base, promoKind } as Order);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to read order" }, 500);
  }
}

/** PUT /api/orders/:id  — update status only */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as { status?: Order["status"] };
    const status = body?.status;
    const allowed: Order["status"][] = ["pending", "paid", "shipped", "completed", "cancelled"];
    if (!status || !allowed.includes(status)) return j({ error: "Invalid status." }, 400);

    const rows: any[] = await sql`
      UPDATE orders SET status=${status} WHERE id=${params.id} RETURNING *
    `;
    if (!rows[0]) return j({ error: "Not found" }, 404);

    const base = baseRowToOrder(rows[0]);
    let promoKind: Order["promoKind"] = null;
    if (base.promoCode) {
      const scRows: any[] = await sql`
        SELECT 1 FROM store_credits WHERE LOWER(code) = LOWER(${base.promoCode}) LIMIT 1
      `;
      promoKind = scRows[0] ? "store_credit" : "promo";
    }
    return j({ ...base, promoKind } as Order);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update order" }, 500);
  }
}