import { NextResponse } from "next/server";
import sql, { toJson } from "../../../lib/db";
import { getPromoByCode, isPromoActive, computeDiscount } from "../../../lib/promos";
import type { Order } from "../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

type CartLine = { id: string; name: string; slug?: string; price: number; quantity: number };
const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* ---------- helpers ---------- */

function parseItems(raw: any): CartLine[] {
  if (Array.isArray(raw)) {
    return raw.map((i) => ({
      id: String(i.id),
      name: String(i.name),
      slug: i.slug ? String(i.slug) : "",
      price: num(i.price),
      quantity: Math.max(1, num(i.quantity, 1)),
    }));
  }
  return [];
}

function rowToOrder(r: any): Order {
  return {
    id: String(r.id),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    status: r.status as Order["status"],
    customer: r.customer || {
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      city: "",
    },
    items: Array.isArray(r.items) ? r.items : [],
    subtotal: num(r.subtotal),
    shipping: num(r.shipping),
    promoCode: r.promo_code ?? null,
    promoDiscount: r.promo_discount == null ? null : num(r.promo_discount),
    freeShipping: Boolean(r.free_shipping),
    total: num(r.total),
    paymentMethod: (r.payment_method as Order["paymentMethod"]) ?? "COD",
    bankSlipName: r.bank_slip_name ?? null,
    bankSlipUrl: r.bank_slip_url ?? null,
  };
}

// recognizable order id: MNY-YYYYMMDD-#### (numeric suffix)
function generateOrderId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0"); // 0000–9999
  return `MNY-${y}${m}${day}-${suffix}`;
}

/* ---------- GET (admin list) ---------- */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;

  const rows: any[] = status
    ? await sql`SELECT * FROM orders WHERE status=${status} ORDER BY created_at DESC`
    : await sql`SELECT * FROM orders ORDER BY created_at DESC`;

  return j(rows.map(rowToOrder));
}

/* ---------- POST (create order) ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = parseItems(body.items);
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    /* 1) STOCK check */
    const ids = items.map((it) => it.id);
    const productRows: any[] = ids.length
      ? await sql`SELECT id, stock, name FROM products WHERE id = ANY(${ids})`
      : [];

    const stock = new Map<string, number>();
    const names = new Map<string, string>();
    for (const r of productRows) {
      stock.set(String(r.id), num(r.stock));
      names.set(String(r.id), String(r.name));
    }

    const shortages: { id: string; name: string; requested: number; available: number }[] = [];
    for (const it of items) {
      const available = stock.has(it.id) ? (stock.get(it.id) as number) : 0;
      if (it.quantity > available) {
        shortages.push({
          id: it.id,
          name: names.get(it.id) || it.name,
          requested: it.quantity,
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

    /* 2) totals & code handling */
    const subtotal = items.reduce((s, it) => s + num(it.price) * it.quantity, 0);
    const baseShipping = num(body.shipping, 400);

    const codeRaw: string = String(body.promoCode || "").trim().toUpperCase();

    let promo_code: string | null = null;
    let promo_discount = 0;
    let free_shipping = false;
    let usedStoreCredit = false; // mark later if order insert succeeds
    let promoKind: Order["promoKind"] = null;

    if (codeRaw) {
      // try PROMO
      const promo = await getPromoByCode(codeRaw);
      const nowPromoOk = promo && isPromoActive(promo);
      if (nowPromoOk) {
        const { discount, freeShipping } = computeDiscount(promo!, subtotal);
        promo_code = promo!.code;
        promo_discount = num(discount, 0);
        free_shipping = !!freeShipping;
        promoKind = "promo";
      } else {
        // try STORE CREDIT
        const rows: any[] = await sql`
          SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_order_id
          FROM store_credits
          WHERE code = ${codeRaw}
          LIMIT 1
        `;
        const sc = rows[0];
        const now = new Date();
        const active =
          !!sc &&
          !!sc.enabled &&
          sc.used_order_id == null &&
          (!sc.starts_at || new Date(sc.starts_at).getTime() <= now.getTime()) &&
          (!sc.ends_at || new Date(sc.ends_at).getTime() >= now.getTime());

        if (active) {
          const minOrder = num(sc.min_order_total, 0);
          if (subtotal > 0 && subtotal >= minOrder) {
            const amount = Math.max(0, num(sc.amount));
            promo_code = sc.code;
            promo_discount = Math.min(amount, subtotal);
            free_shipping = false;
            usedStoreCredit = true;
            promoKind = "store_credit";
          }
        }
      }
    }

    const shipping = free_shipping ? 0 : baseShipping;
    const total = Math.max(0, subtotal - promo_discount) + shipping;

    /* 3) build customer JSON */
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
    const bank_slip_name = body.bankSlipName ?? null;
    const bank_slip_url = body.bankSlipUrl ?? null;

    const order_id = generateOrderId();

    /* 4) write order, decrement stock */
    const created: any[] = await sql`
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
        ${toJson(customer)}::jsonb,
        ${toJson(items)}::jsonb,
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

    for (const it of items) {
      await sql`UPDATE products SET stock = stock - ${it.quantity} WHERE id = ${it.id}`;
    }

    // 5) If we used a STORE CREDIT, consume it now (only after order creation)
    if (usedStoreCredit && promo_code) {
      await sql`
        UPDATE store_credits
        SET used_order_id = ${order_id}, used_at = now()
        WHERE code = ${promo_code} AND used_order_id IS NULL
      `;
    }

    const row = created[0];
    return j(
      {
        ok: true,
        orderId: row.id,
        subtotal: num(row.subtotal),
        shipping: num(row.shipping),
        promoCode: row.promo_code ?? null,
        promoDiscount: row.promo_discount == null ? null : num(row.promo_discount),
        freeShipping: !!row.free_shipping,
        total: num(row.total),
        promoKind, // NEW
      },
      201
    );
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}