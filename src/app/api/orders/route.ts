import { NextResponse } from "next/server";
import { sql, toJson } from "../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "cancelled";

/* GET /api/orders?status=... */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const rows = (await sql`
      select id, created_at, status, customer, items,
             subtotal, shipping, promo_code, promo_discount, free_shipping,
             total, payment_method, bank_slip_name, bank_slip_url
      from orders
      ${status ? sql`where status = ${status}` : sql``}
      order by created_at desc
    `) as any[];
    return j(rows);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load orders." }, 500);
  }
}

/* POST /api/orders */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    // availability
    const idList = items.map((it: any) => String(it.id));
    const dbProducts = (await sql`
      select id, stock from products where id in (${sql(idList)})
    `) as { id: string; stock: number }[];
    const stockMap = new Map(dbProducts.map((p) => [p.id, Number(p.stock)]));

    const shortages: { id: string; name: string; requested: number; available: number }[] = [];
    for (const it of items) {
      const qty = Math.max(1, Number(it.quantity || 1));
      const available = stockMap.get(String(it.id)) ?? 0;
      if (qty > available) {
        shortages.push({
          id: String(it.id),
          name: String(it.name || "Unknown"),
          requested: qty,
          available,
        });
      }
    }
    if (shortages.length > 0) {
      return j({ error: "Some items are not available.", shortages }, 409);
    }

    // totals
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
      0
    );
    const discount = Number(body.promoDiscount || 0);
    const freeShipping = !!body.freeShipping;
    const shipping = freeShipping ? 0 : Number(body.shipping ?? 350);
    const total = Math.max(0, subtotal - discount) + shipping;

    const order = {
      id: `ord_${Date.now()}`,
      status: "pending" as OrderStatus,
      customer: body.customer || {},
      items: items.map((it: any) => ({
        id: String(it.id),
        name: String(it.name),
        slug: String(it.slug ?? ""),
        price: Number(it.price || 0),
        quantity: Math.max(1, Number(it.quantity || 1)),
      })),
      subtotal,
      shipping,
      promo_code: body.promoCode ?? null,
      promo_discount: discount || null,
      free_shipping: freeShipping,
      total,
      payment_method: body.paymentMethod === "BANK" ? "BANK" : "COD",
      bank_slip_name: body.bankSlipName ?? null,
      bank_slip_url: body.bankSlipUrl ?? null,
    };

    // deduct stock
    for (const it of order.items) {
      await sql`
        update products
        set stock = greatest(0, stock - ${it.quantity})
        where id = ${it.id}
      `;
    }

    // save order
    await sql`
      insert into orders (
        id, created_at, status, customer, items,
        subtotal, shipping, promo_code, promo_discount, free_shipping,
        total, payment_method, bank_slip_name, bank_slip_url
      )
      values (
        ${order.id}, now(), ${order.status},
        ${toJson(order.customer)}::jsonb, ${toJson(order.items)}::jsonb,
        ${order.subtotal}, ${order.shipping}, ${order.promo_code}, ${order.promo_discount},
        ${order.free_shipping}, ${order.total}, ${order.payment_method},
        ${order.bank_slip_name}, ${order.bank_slip_url}
      )
    `;

    return j({ ok: true, orderId: order.id }, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}