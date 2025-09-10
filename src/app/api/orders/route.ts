// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/orders?status=... */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const rows = (await sql`
    SELECT *
    FROM orders
    ${status ? sql`WHERE status = ${status}` : sql``}
    ORDER BY created_at DESC
  `) as any[];

  return j(rows);
}

/* POST /api/orders */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return j({ error: "Empty cart." }, 400);

    // 1) check availability
    const ids = items.map((it: any) => String(it.id));
    const dbProducts = (await sql`
      SELECT id, name, stock FROM products WHERE id IN (${sql(ids)})
    `) as any[];

    const byId = new Map(dbProducts.map((p) => [String(p.id), p]));
    const shortages: { id: string; name: string; requested: number; available: number }[] = [];
    for (const it of items) {
      const id = String(it.id);
      const qty = Math.max(1, Number(it.quantity || 1));
      const p = byId.get(id);
      const available = Number(p?.stock ?? 0);
      if (!p || qty > available) {
        shortages.push({
          id,
          name: p?.name ?? String(it.name ?? "Unknown"),
          requested: qty,
          available,
        });
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

    // 2) totals
    const subtotal = items.reduce(
      (s: number, it: any) =>
        s + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
      0
    );

    // Optional: promo lookups from your promos table if you add one later
    const discount = Number(body.promoDiscount || 0);
    const freeShipping = !!body.freeShipping;
    const shipping = freeShipping ? 0 : Number(body.shipping ?? 350);
    const total = Math.max(0, subtotal - discount) + shipping;

    // 3) transaction (no .begin — manual BEGIN/COMMIT)
    await sql`BEGIN`;
    try {
      // insert order
      const insertedOrder = (await sql`
        INSERT INTO orders (
          created_at, status,
          customer_first_name, customer_last_name, customer_email,
          customer_address, customer_city, customer_postal, customer_phone, customer_notes,
          ship_name, ship_phone, ship_address, ship_city, ship_postal,
          payment_method, bank_slip_name, bank_slip_url,
          subtotal, shipping, promo_code, promo_discount, free_shipping, total
        )
        VALUES (
          NOW(), 'pending',
          ${body.customer?.firstName ?? ""}, ${body.customer?.lastName ?? ""}, ${body.customer?.email ?? ""},
          ${body.customer?.address ?? ""}, ${body.customer?.city ?? ""}, ${body.customer?.postal ?? ""},
          ${body.customer?.phone ?? ""}, ${body.customer?.notes ?? ""},
          ${
            body.shipDifferent
              ? `${body.shippingAddress?.firstName ?? ""} ${body.shippingAddress?.lastName ?? ""}`.trim()
              : null
          },
          ${body.shipDifferent ? body.shippingAddress?.phone ?? "" : null},
          ${body.shipDifferent ? body.shippingAddress?.address ?? "" : null},
          ${body.shipDifferent ? body.shippingAddress?.city ?? "" : null},
          ${body.shipDifferent ? body.shippingAddress?.postal ?? "" : null},
          ${body.paymentMethod === "BANK" ? "BANK" : "COD"},
          ${null}, ${body.bankSlipUrl ?? null},
          ${subtotal}, ${shipping}, ${body.promoCode ?? null}, ${discount || null}, ${freeShipping}, ${total}
        )
        RETURNING id
      `) as any[];
      const orderId = insertedOrder[0].id as string;

      // insert items + deduct stock
      for (const it of items) {
        const pid = String(it.id);
        const qty = Math.max(1, Number(it.quantity || 1));
        const price = Number(it.price || 0);
        const name = String(it.name || "");
        const slug = String(it.slug || "");

        await sql`
          INSERT INTO order_items (order_id, product_id, name, slug, price, quantity)
          VALUES (${orderId}, ${pid}, ${name}, ${slug}, ${price}, ${qty})
        `;

        await sql`
          UPDATE products
          SET stock = GREATEST(0, stock - ${qty})
          WHERE id = ${pid}
        `;
      }

      await sql`COMMIT`;
      return j({ ok: true, orderId }, 201);
    } catch (err) {
      await sql`ROLLBACK`;
      throw err;
    }
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}