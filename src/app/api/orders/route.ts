// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/orders */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const rows = await sql`
    select id, created_at, status, customer, payment_method, bank_slip_name, bank_slip_url,
           subtotal, shipping, promo_code, promo_discount, free_shipping, total
    from orders
    ${status ? sql`where status = ${status}` : sql``}
    order by created_at desc
  `;

  // Minimal payload (items are in order_items table; fetch separately in details page)
  const orders = rows.map((r: any) => ({
    id: r.id,
    createdAt: r.created_at,
    status: r.status,
    customer: r.customer,
    paymentMethod: r.payment_method,
    bankSlipName: r.bank_slip_name ?? undefined,
    bankSlipUrl: r.bank_slip_url ?? undefined,
    subtotal: Number(r.subtotal),
    shipping: Number(r.shipping),
    promoCode: r.promo_code ?? undefined,
    promoDiscount: r.promo_discount ?? undefined,
    freeShipping: !!r.free_shipping,
    total: Number(r.total),
  }));

  return j(orders);
}

/* POST /api/orders  — validates stock, deducts, saves order + items */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return j({ error: "Empty cart." }, 400);

    // --- check stock first (no generics / no custom placeholders) ---
    const shortages: any[] = [];
    for (const it of items) {
      const id = String(it.id);
      const qty = Math.max(1, Number(it.quantity || 1));
      const row = await sql`select name, stock from products where id = ${id} limit 1`;
      if (!row.length) {
        shortages.push({ id, name: String(it.name || "Unknown"), requested: qty, available: 0 });
        continue;
      }
      const available = Number(row[0].stock ?? 0);
      if (qty > available) {
        shortages.push({ id, name: row[0].name, requested: qty, available });
      }
    }
    if (shortages.length) {
      return j(
        {
          error:
            "Some items are not available in the requested quantity. Please adjust your cart.",
          shortages,
        },
        409
      );
    }

    // --- totals (use values from client for now) ---
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
      0
    );
    const discount = Number(body.promoDiscount || 0);
    const freeShipping = !!body.freeShipping;
    const shipping = freeShipping ? 0 : Number(body.shipping ?? 350);
    const total = Math.max(0, subtotal - discount) + shipping;

    // --- create order ---
    const inserted = await sql`
      insert into orders
        (status, customer, payment_method, bank_slip_name, bank_slip_url,
         subtotal, shipping, promo_code, promo_discount, free_shipping, total)
      values
        ('pending', ${body.customer ?? {}}, ${body.paymentMethod === 'BANK' ? 'BANK' : 'COD'},
         ${body.bankSlipName ?? null}, ${body.bankSlipUrl ?? null},
         ${subtotal}, ${shipping}, ${body.promoCode ?? null}, ${discount || null},
         ${freeShipping}, ${total})
      returning id, created_at
    `;
    const orderId = inserted[0].id;

    // --- insert items + deduct stock ---
    for (const it of items) {
      const id = String(it.id);
      const name = String(it.name);
      const slug = String(it.slug ?? "");
      const price = Number(it.price || 0);
      const qty = Math.max(1, Number(it.quantity || 1));

      await sql`
        insert into order_items (order_id, product_id, slug, name, price, quantity)
        values (${orderId}, ${id}, ${slug}, ${name}, ${price}, ${qty})
      `;

      await sql`
        update products set stock = stock - ${qty}
        where id = ${id}
      `;
    }

    return j({ ok: true, orderId }, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}
