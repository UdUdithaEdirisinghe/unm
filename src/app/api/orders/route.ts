// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import sql, { toJson } from "../../../lib/db";
import { getPromoByCode, isPromoActive, computeDiscount } from "../../../lib/promos";
import { getStoreCreditByCode, canApplyStoreCredit, markStoreCreditUsed } from "../../../lib/storeCredits";
import type { Order } from "../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d:any, s=200) => NextResponse.json(d, { status:s });

type CartLine = { id:string; name:string; slug?:string; price:number; quantity:number };
const n = (v:any, d=0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function parseItems(raw:any): CartLine[] {
  if (Array.isArray(raw)) {
    return raw.map(i => ({
      id: String(i.id),
      name: String(i.name),
      slug: i.slug ? String(i.slug) : "",
      price: n(i.price),
      quantity: Math.max(1, n(i.quantity, 1)),
    }));
  }
  return [];
}

/** Human-readable order IDs: UNM-YYYYMMDD-ABCDE */
function generateOrderId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map(v => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[v % 36])
    .join("");
  return `UNM-${y}${m}${d}-${random}`;
}

/* ---------- GET: list ---------- */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const rows:any[] = status
    ? await sql`SELECT * FROM orders WHERE status=${status} ORDER BY created_at DESC`
    : await sql`SELECT * FROM orders ORDER BY created_at DESC`;
  const fmt = (r:any): Order => ({
    id: String(r.id),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    status: r.status,
    customer: r.customer || { firstName:"", lastName:"", email:"", address:"", city:"" },
    items: Array.isArray(r.items) ? r.items : [],
    subtotal: n(r.subtotal),
    shipping: n(r.shipping),
    promoCode: r.promo_code ?? null,          // may hold promo OR store-credit code
    promoDiscount: r.promo_discount==null ? null : n(r.promo_discount),
    freeShipping: !!r.free_shipping,
    total: n(r.total),
    paymentMethod: r.payment_method ?? "COD",
    bankSlipName: r.bank_slip_name ?? null,
    bankSlipUrl: r.bank_slip_url ?? null,
  });
  return j(rows.map(fmt));
}

/* ---------- POST: create ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const items = parseItems(body.items);
    if (items.length === 0) return j({ error:"Empty cart." }, 400);

    // Load stocks
    const ids = items.map(it => it.id);
    const productRows:any[] = ids.length
      ? await sql`SELECT id, stock, name FROM products WHERE id = ANY(${ids})` : [];
    const stockMap = new Map<string, number>();
    const nameMap = new Map<string, string>();
    for (const r of productRows) {
      stockMap.set(String(r.id), n(r.stock));
      nameMap.set(String(r.id), String(r.name));
    }
    // Shortages
    const shortages: {id:string; name:string; requested:number; available:number}[] = [];
    for (const it of items) {
      const available = stockMap.has(it.id) ? (stockMap.get(it.id) as number) : 0;
      if (it.quantity > available) {
        shortages.push({ id: it.id, name: nameMap.get(it.id) || it.name, requested: it.quantity, available });
      }
    }
    if (shortages.length) return j({ error:"Some items are not available in the requested quantity.", shortages }, 409);

    // Totals
    const subtotal = items.reduce((s, it) => s + n(it.price) * it.quantity, 0);
    const baseShipping = n(body.shipping, 400); // default 400
    const codeRaw: string = String(body.promoCode || "").trim().toUpperCase();

    let promo_code: string | null = null;
    let promo_discount = 0;
    let free_shipping = false;
    let usedStoreCredit = false; // we’ll mark later if we consume it

    if (codeRaw) {
      // 1) Try promo
      const promo = await getPromoByCode(codeRaw);
      if (promo && isPromoActive(promo)) {
        const { discount, freeShipping } = computeDiscount(promo, subtotal);
        promo_code = promo.code;
        promo_discount = n(discount, 0);
        free_shipping = !!freeShipping;
      } else {
        // 2) Try store credit (fixed amount, one-use; only if subtotal >= credit)
        const credit = await getStoreCreditByCode(codeRaw);
        if (credit) {
          const ok = canApplyStoreCredit(credit, subtotal);
          if (ok.ok) {
            promo_code = credit.code;           // reuse promo fields so UI shows the code
            promo_discount = n(credit.amount, 0);
            free_shipping = false;
            usedStoreCredit = true;             // mark after successful insert
          }
        }
      }
    }

    const shipping = free_shipping ? 0 : baseShipping;
    const total = Math.max(0, subtotal - promo_discount) + shipping;

    // Customer JSON
    const customer = {
      firstName: String(body.customer?.firstName || ""),
      lastName: String(body.customer?.lastName || ""),
      email: String(body.customer?.email || ""),
      phone: body.customer?.phone ? String(body.customer.phone) : undefined,
      address: String(body.customer?.address || ""),
      city: String(body.customer?.city || ""),
      postal: body.customer?.postal ? String(body.customer.postal) : undefined,
      notes: body.customer?.notes ? String(body.customer.notes) : undefined,
      shipToDifferent: body.shipDifferent ? {
        name: (body.shippingAddress?.name as string) ||
              [body.shippingAddress?.firstName, body.shippingAddress?.lastName].filter(Boolean).join(" "),
        phone: body.shippingAddress?.phone || "",
        address: body.shippingAddress?.address || "",
        city: body.shippingAddress?.city || "",
        postal: body.shippingAddress?.postal || "",
      } : undefined,
    };

    const payment_method: "COD"|"BANK" = body.paymentMethod === "BANK" ? "BANK" : "COD";
    const bank_slip_name = body.bankSlipName ?? null;
    const bank_slip_url = body.bankSlipUrl ?? null;

    const order_id = generateOrderId();

    // Insert order
    const createdRows:any[] = await sql`
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
      RETURNING id
    `;

    // decrement stock
    for (const it of items) {
      await sql`UPDATE products SET stock = stock - ${it.quantity} WHERE id = ${it.id}`;
    }

    // Mark store credit as used (AFTER successful insert)
    if (codeRaw && usedStoreCredit) {
      await markStoreCreditUsed(codeRaw, order_id);
    }

    return j({ ok:true, orderId: order_id, subtotal, shipping, promoCode: promo_code, promoDiscount: promo_discount, freeShipping: free_shipping, total }, 201);
  } catch (e:any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}