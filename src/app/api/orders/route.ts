import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { readPromos, computeDiscount } from "../../../lib/promos";

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

/* GET /api/orders?status=... */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const rows =
    status
      ? (await sql`
          select * from orders
          where status = ${status}
          order by created_at desc
        `) as any[]
      : (await sql`
          select * from orders
          order by created_at desc
        `) as any[];

  return j(rows.map(mapOrder));
}

/* POST /api/orders  (create order + stock check + reduce stock) */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    // 1) Check availability
    const ids: string[] = items.map((it: any) => String(it.id));
    const stocks =
      ids.length === 0
        ? []
        : (await sql`
            select id, name, stock
            from products
            where id = ANY(${ids}::text[])
          `) as any[];

    type Shortage = { id: string; name: string; requested: number; available: number };
    const byId: Record<string, any> = Object.fromEntries(stocks.map((r) => [r.id, r]));
    const shortages: Shortage[] = [];
    for (const it of items) {
      const id = String(it.id);
      const reqQty = Math.max(1, Number(it.quantity || 1));
      const p = byId[id];
      const available = Number(p?.stock ?? 0);
      if (!p || reqQty > available) {
        shortages.push({
          id,
          name: p?.name ?? String(it.name || "Unknown item"),
          requested: reqQty,
          available,
        });
      }
    }
    if (shortages.length) {
      return j(
        { error: "Some items are not available in the requested quantity.", shortages },
        409
      );
    }

    // 2) Pricing
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
      0
    );

    let discount = 0;
    let freeShipping = false;
    if (body.promoCode) {
      const promos = await readPromos();
      const m = promos.find(
        (p) => p.code.toUpperCase() === String(body.promoCode).toUpperCase()
      );
      if (m) {
        const res = computeDiscount(m, subtotal);
        discount = res.discount;
        freeShipping = res.freeShipping;
      }
    }

    const shipping = freeShipping ? 0 : Number(body.shipping ?? 350);
    const total = Math.max(0, subtotal - discount) + shipping;

    const orderId = `ord_${Date.now()}`;
    const createdAt = new Date().toISOString();

    // 3) Reduce stock (simple loop; small scale is fine)
    for (const it of items) {
      const qty = Math.max(1, Number(it.quantity || 1));
      await sql`
        update products
        set stock = stock - ${qty}
        where id = ${String(it.id)}
      `;
    }

    // 4) Insert order
    const customer = {
      firstName: body.customer?.firstName ?? "",
      lastName: body.customer?.lastName ?? "",
      email: body.customer?.email ?? "",
      address: body.customer?.address ?? "",
      city: body.customer?.city ?? "",
      postal: body.customer?.postal ?? "",
      phone: body.customer?.phone ?? "",
      notes: body.customer?.notes ?? "",
      shipToDifferent: body.shipDifferent
        ? {
            name: `${body.shippingAddress?.firstName ?? ""} ${body.shippingAddress?.lastName ?? ""}`.trim(),
            phone: body.shippingAddress?.phone ?? "",
            address: body.shippingAddress?.address ?? "",
            city: body.shippingAddress?.city ?? "",
            postal: body.shippingAddress?.postal ?? "",
          }
        : undefined,
    };

    const normItems = items.map((it: any) => ({
      id: String(it.id),
      name: String(it.name),
      slug: String(it.slug ?? ""),
      price: Number(it.price || 0),
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));

    await sql`
      insert into orders
        (id, created_at, status, customer, items, subtotal, shipping, promo_code, promo_discount, free_shipping, total, payment_method, bank_slip_name, bank_slip_url)
      values
        (${orderId}, ${createdAt}, ${"pending"}, ${customer}, ${normItems}, ${subtotal}, ${shipping},
         ${body.promoCode ?? null}, ${discount || null}, ${freeShipping}, ${total},
         ${body.paymentMethod === "BANK" ? "BANK" : "COD"}, ${body.bankSlipName ?? null}, ${body.bankSlipUrl ?? null})
    `;

    return j({ ok: true, orderId }, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}