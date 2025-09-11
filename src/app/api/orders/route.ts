// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import sql from "../../../lib/db";

const j = (d: unknown, s = 200) => NextResponse.json(d, { status: s });

type CartLine = { id: string; name: string; slug: string; price: number; quantity: number };
type ShipDifferent = { name?: string; firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; postal?: string };
type Customer = {
  firstName: string; lastName: string; email: string; phone?: string;
  address: string; city: string; postal?: string; notes?: string;
  shipToDifferent?: ShipDifferent;
};

/* GET /api/orders[?status=...] */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const rows =
      status && ["pending", "paid", "shipped", "completed", "cancelled"].includes(status)
        ? await sql/* sql */`SELECT * FROM orders WHERE status = ${status} ORDER BY created_at DESC`
        : await sql/* sql */`SELECT * FROM orders ORDER BY created_at DESC`;
    return j(rows);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load orders." }, 500);
  }
}

/* POST /api/orders */
export async function POST(req: Request) {
  try {
    const body: any = await req.json();

    const items: CartLine[] = Array.isArray(body.items)
      ? body.items.map((it: any) => ({
          id: String(it.id),
          name: String(it.name),
          slug: String(it.slug ?? ""),
          price: Number(it.price || 0),
          quantity: Math.max(1, Number(it.quantity || 1)),
        }))
      : [];
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    const subtotal = items.reduce((sum: number, it: CartLine) => sum + it.price * it.quantity, 0);
    const freeShipping: boolean = Boolean(body.freeShipping ?? false);
    const shipping: number = freeShipping ? 0 : Number(body.shipping ?? 350);
    const promoCode: string | undefined = body.promoCode ? String(body.promoCode).toUpperCase() : undefined;
    const promoDiscount: number = Number(body.promoDiscount ?? 0) || 0;
    const total: number = Math.max(0, subtotal - promoDiscount) + shipping;

    const shipToDifferent: ShipDifferent | undefined = body.shipDifferent
      ? {
          name:
            `${body.shippingAddress?.firstName ?? ""} ${body.shippingAddress?.lastName ?? ""}`.trim() || undefined,
          phone: body.shippingAddress?.phone || undefined,
          address: body.shippingAddress?.address || undefined,
          city: body.shippingAddress?.city || undefined,
          postal: body.shippingAddress?.postal || undefined,
        }
      : undefined;

    const customer: Customer = {
      firstName: body.customer?.firstName ?? "",
      lastName: body.customer?.lastName ?? "",
      email: body.customer?.email ?? "",
      phone: body.customer?.phone ?? "",
      address: body.customer?.address ?? "",
      city: body.customer?.city ?? "",
      postal: body.customer?.postal ?? "",
      notes: body.customer?.notes ?? "",
      shipToDifferent,
    };

    const paymentMethod: "COD" | "BANK" = body.paymentMethod === "BANK" ? "BANK" : "COD";
    const bankSlipName: string | null = body.bankSlipName ?? null;
    const bankSlipUrl: string | null = body.bankSlipUrl ?? null;

    const orderId = `ord_${Date.now()}`;

    // Start transaction
    await sql/* sql */`BEGIN`;
    try {
      // Deduct stock for each item
      for (const it of items) {
        await sql/* sql */`
          UPDATE products
          SET stock = GREATEST(0, stock - ${it.quantity})
          WHERE id = ${it.id}
        `;
      }

      // Insert order (stringify JSON and cast to jsonb)
      const inserted = await sql/* sql */`
        INSERT INTO orders (
          id, created_at, status,
          customer, items,
          subtotal, shipping, total,
          promo_code, promo_discount, free_shipping,
          payment_method, bank_slip_name, bank_slip_url
        )
        VALUES (
          ${orderId}, NOW(), ${"pending"},
          ${JSON.stringify(customer)}::jsonb,
          ${JSON.stringify(items)}::jsonb,
          ${subtotal}, ${shipping}, ${total},
          ${promoCode ?? null}, ${promoDiscount || null}, ${freeShipping},
          ${paymentMethod}, ${bankSlipName}, ${bankSlipUrl}
        )
        RETURNING *
      `;

      await sql/* sql */`COMMIT`;
      return j({ ok: true, orderId, order: inserted[0] }, 201);
    } catch (inner: any) {
      await sql/* sql */`ROLLBACK`;
      throw inner;
    }
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}