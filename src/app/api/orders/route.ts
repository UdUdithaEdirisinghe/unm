// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import sql from "../../../lib/db";
import { getPromoByCode, isPromoActive, computeDiscount } from "../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

type CartLine = { id: string; name: string; slug?: string; price: number; quantity: number };

function n(v: any, d = 0) { const x = Number(v); return Number.isFinite(x) ? x : d; }

function parseItems(raw: any): CartLine[] {
  if (Array.isArray(raw)) return raw.map(i => ({
    id: String(i.id), name: String(i.name),
    slug: i.slug ? String(i.slug) : "",
    price: n(i.price), quantity: Math.max(1, n(i.quantity, 1)),
  }));
  return [];
}

/* ---------- GET: list orders (for Admin) ---------- */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;

  const rows: any[] = status
    ? await sql`SELECT * FROM orders WHERE status=${status} ORDER BY created_at DESC`
    : await sql`SELECT * FROM orders ORDER BY created_at DESC`;

  return j(rows.map(r => ({
    id: String(r.id),
    createdAt: String(r.created_at ?? r.createdAt ?? ""),
    status: r.status,
    customer: r.customer,            // jsonb from DB
    items: r.items,                  // jsonb from DB
    subtotal: n(r.subtotal),
    shipping: n(r.shipping),
    promoCode: r.promo_code ?? undefined,
    promoDiscount: n(r.promo_discount, 0) || undefined,
    freeShipping: Boolean(r.free_shipping),
    total: n(r.total),
    paymentMethod: r.payment_method ?? "COD",
    bankSlipName: r.bank_slip_name ?? undefined,
    bankSlipUrl: r.bank_slip_url ?? undefined,
  })));
}

/* ---------- POST: create order (used by checkout) ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const items = parseItems(body.items);
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    // recompute subtotal from the items we received
    const subtotal = items.reduce((s, it) => s + n(it.price) * Math.max(1, n(it.quantity, 1)), 0);

    // promo (server-side!)
    const codeRaw: string = String(body.promoCode || "").trim().toUpperCase();
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

    // shipping (respect free shipping)
    const baseShipping = n(body.shipping, 350);
    const shipping = free_shipping ? 0 : baseShipping;

    // final total exactly like checkout shows
    const total = Math.max(0, subtotal - promo_discount) + shipping;

    // customer object (we store as JSONB)
    const customer = {
      firstName: String(body.customer?.firstName || ""),
      lastName: String(body.customer?.lastName || ""),
      email: String(body.customer?.email || ""),
      phone: body.customer?.phone ? String(body.customer.phone) : undefined,
      address: String(body.customer?.address || ""),
      city: String(body.customer?.city || ""),
      postal: body.customer?.postal ? String(body.customer.postal) : undefined,
      notes: body.customer?.notes ? String(body.customer.notes) : undefined,
      // optional ship-to-different
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

    const payment_method = body.paymentMethod === "BANK" ? "BANK" : "COD";
    const bank_slip_name = body.bankSlipName ?? null;
    const bank_slip_url = body.bankSlipUrl ?? null;

    const order_id = `ord_${Date.now()}`;

    // insert (cast JSON with ::jsonb)
    const rows: any[] = await sql`
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
    `;

    const row = rows[0];
    return j({
      ok: true,
      orderId: row.id,
      subtotal: n(row.subtotal),
      shipping: n(row.shipping),
      promoCode: row.promo_code ?? undefined,
      promoDiscount: n(row.promo_discount, 0) || undefined,
      freeShipping: Boolean(row.free_shipping),
      total: n(row.total),
    }, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}