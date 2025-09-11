// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import sql from "../../../lib/db";
import { getPromoByCode, isPromoActive, computeDiscount } from "../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

type CartLine = {
  id: string;
  name: string;
  slug?: string;
  price: number;
  quantity: number;
};

const n = (v: unknown, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};

function parseItems(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => ({
    id: String((it as any).id),
    name: String((it as any).name),
    slug: (it as any).slug ? String((it as any).slug) : "",
    price: n((it as any).price),
    quantity: Math.max(1, n((it as any).quantity, 1)),
  }));
}

/* ========================= GET: list orders (Admin) ========================= */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;

  const rows: any[] = status
    ? await sql`SELECT * FROM orders WHERE status = ${status} ORDER BY created_at DESC`
    : await sql`SELECT * FROM orders ORDER BY created_at DESC`;

  return j(
    rows.map((r) => ({
      id: String(r.id),
      createdAt: String(r.created_at ?? r.createdAt ?? ""),
      status: r.status,
      customer: r.customer, // jsonb
      items: r.items, // jsonb
      subtotal: n(r.subtotal),
      shipping: n(r.shipping),
      promoCode: r.promo_code ?? undefined,
      promoDiscount: n(r.promo_discount, 0) || undefined,
      freeShipping: Boolean(r.free_shipping),
      total: n(r.total),
      paymentMethod: r.payment_method ?? "COD",
      bankSlipName: r.bank_slip_name ?? undefined,
      bankSlipUrl: r.bank_slip_url ?? undefined,
    }))
  );
}

/* ========================= POST: create order (Checkout) ========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1) Cart lines
    const items = parseItems(body.items);
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    // 2) Recompute subtotal
    const subtotal = items.reduce((s, it) => s + n(it.price) * it.quantity, 0);

    // 3) Promo (server-side)
    const codeRaw = String(body.promoCode || "").trim().toUpperCase();
    let promo_code: string | null = null;
    let promo_discount = 0;
    let free_shipping = false;

    if (codeRaw) {
      const promo = await getPromoByCode(codeRaw);
      if (promo && isPromoActive(promo)) {
        const { discount, freeShipping } = computeDiscount(promo, subtotal);
        promo_code = promo.code;
        promo_discount = n(discount, 0);
        free_shipping = Boolean(freeShipping);
      }
    }

    // 4) Shipping + final total
    const baseShipping = n(body.shipping, 350);
    const shipping = free_shipping ? 0 : baseShipping;
    const total = Math.max(0, subtotal - promo_discount) + shipping;

    // 5) Build customer JSON
    const customer = {
      firstName: String(body.customer?.firstName || ""),
      lastName: String(body.customer?.lastName || ""),
      email: String(body.customer?.email || ""),
      phone: body.customer?.phone ? String(body.customer.phone) : undefined,
      address: String(body.customer?.address || ""),
      city: String(body.customer?.city || ""),
      postal: body.customer?.postal ? String(body.customer.postal) : undefined,
      notes: body.customer?.notes ? String(body.customer.notes) : undefined,
      shipToDifferent: body.shipDifferent
        ? {
            name:
              (body.shippingAddress?.name as string) ||
              [body.shippingAddress?.firstName, body.shippingAddress?.lastName]
                .filter(Boolean)
                .join(" "),
            phone: body.shippingAddress?.phone || "",
            address: body.shippingAddress?.address || "",
            city: body.shippingAddress?.city || "",
            postal: body.shippingAddress?.postal || "",
          }
        : undefined,
    };

    const payment_method: "COD" | "BANK" =
      body.paymentMethod === "BANK" ? "BANK" : "COD";
    const bank_slip_name: string | null = body.bankSlipName ?? null;
    const bank_slip_url: string | null = body.bankSlipUrl ?? null;

    // 6) Check stock BEFORE placing the order
    const productIds = items.map((it) => it.id);
    const stockRows =
      productIds.length > 0
        ? (await sql`
            SELECT id, stock
            FROM products
            WHERE id = ANY(${productIds}::text[])
          `) as Array<{ id: string; stock: number }>
        : ([] as Array<{ id: string; stock: number }>);

    const stockMap = new Map<string, number>(
      stockRows.map((r) => [String(r.id), Number(r.stock)])
    );

    const insufficient = items
      .map((it) => ({
        id: it.id,
        requested: it.quantity,
        available: stockMap.get(it.id) ?? 0,
      }))
      .filter((x) => x.requested > x.available);

    if (insufficient.length) {
      return j(
        { error: "Some items exceed available stock.", details: insufficient },
        400
      );
    }

    const order_id = `ord_${Date.now()}`;

    // 7) Deduct stock atomically — NO sql.join, use UNNEST instead
    const idsArr = items.map((it) => it.id);
    const qtyArr = items.map((it) => it.quantity);

    await sql`
      UPDATE products
      SET stock = products.stock - v.qty
      FROM (
        SELECT unnest(${idsArr}::text[]) AS id,
               unnest(${qtyArr}::int[])  AS qty
      ) AS v
      WHERE products.id = v.id
    `;

    // 8) Insert order (JSON -> ::jsonb)
    const rows = (await sql`
      INSERT INTO orders (
        id, created_at, status,
        customer, items,
        subtotal, shipping,
        promo_code, promo_discount, free_shipping,
        total,
        payment_method, bank_slip_name, bank_slip_url
      ) VALUES (
        ${order_id},
        now(),
        ${"pending"},
        ${JSON.stringify(customer)}::jsonb,
        ${JSON.stringify(items)}::jsonb,
        ${subtotal},
        ${shipping},
        ${promo_code},
        ${promo_discount},
        ${free_shipping},
        ${total},
        ${payment_method},
        ${bank_slip_name},
        ${bank_slip_url}
      )
      RETURNING *
    `) as Array<any>;

    const row = rows[0];

    return j(
      {
        ok: true,
        orderId: row.id,
        subtotal: n(row.subtotal),
        shipping: n(row.shipping),
        promoCode: row.promo_code ?? undefined,
        promoDiscount: n(row.promo_discount, 0) || undefined,
        freeShipping: Boolean(row.free_shipping),
        total: n(row.total),
      },
      201
    );
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}