// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import {
  readOrders,
  writeOrders,
  type Order,
} from "../../../lib/products";
import { readProducts, writeProducts } from "../../../lib/products";
import { readPromos, computeDiscount } from "../../../lib/promos";
import { sendOrderEmail } from "../../../lib/email";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const orders = await readOrders();
  const filtered = status ? orders.filter((o) => o.status === status) : orders;
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
  return j(filtered);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Expect: items[], paymentMethod, promoCode?, bankSlipUrl?, customer{}, shipDifferent?, shippingAddress?
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return j({ error: "Empty cart." }, 400);

    // --- Load products and validate availability BEFORE computing totals ---
    const products = await readProducts();

    type Shortage = { id: string; name: string; requested: number; available: number };
    const shortages: Shortage[] = [];

    for (const it of items) {
      const id = String(it.id);
      const qty = Math.max(1, Number(it.quantity || 1));
      const p = products.find((pr) => pr.id === id);

      // If product missing or zero stock → treat as 0 available
      const available = p?.stock ?? 0;

      if (!p) {
        shortages.push({
          id,
          name: String(it.name || "Unknown item"),
          requested: qty,
          available: 0,
        });
        continue;
      }
      if (qty > available) {
        shortages.push({
          id,
          name: p.name,
          requested: qty,
          available,
        });
      }
    }

    if (shortages.length > 0) {
      // 409 Conflict is appropriate for business-rule failures
      return j(
        {
          error:
            "Some items are not available in the requested quantity. Please adjust your cart.",
          shortages,
        },
        409
      );
    }

    // --- recompute subtotal from request payload (prices from cart) ---
    const subtotal = items.reduce(
      (sum: number, it: any) =>
        sum + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
      0
    );

    // --- check promo properly from promos.json ---
    let discount = 0;
    let freeShipping = false;
    if (body.promoCode) {
      const promos = await readPromos();
      const match = promos.find(
        (p) => p.code.toUpperCase() === String(body.promoCode).toUpperCase()
      );
      if (match) {
        const { discount: d, freeShipping: f } = computeDiscount(match, subtotal);
        discount = d;
        freeShipping = f;
      }
    }

    const shipping = freeShipping ? 0 : Number(body.shipping ?? 350);
    const total = Math.max(0, subtotal - discount) + shipping;

    const order: Order = {
      id: `ord_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      customer: {
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
      },
      paymentMethod: body.paymentMethod === "BANK" ? "BANK" : "COD",
      bankSlipName: undefined,
      bankSlipUrl: body.bankSlipUrl ?? undefined,
      items: items.map((it: any) => ({
        id: String(it.id),
        name: String(it.name),
        slug: String(it.slug ?? ""),
        price: Number(it.price || 0),
        quantity: Math.max(1, Number(it.quantity || 1)),
      })),
      subtotal,
      shipping,
      promoCode: body.promoCode ?? undefined,
      promoDiscount: discount || undefined,
      freeShipping,
      total,
    };

    // --- Deduct stock (we already know all are available) ---
    for (const it of order.items) {
      const p = products.find((pr) => pr.id === it.id);
      if (p) p.stock = Math.max(0, (p.stock ?? 0) - it.quantity);
    }
    await writeProducts(products);

    // --- Save order ---
    const orders = await readOrders();
    orders.push(order);
    await writeOrders(orders);

    // --- Try email (won’t fail the order process if this throws) ---
    try {
      await sendOrderEmail(order);
      // eslint-disable-next-line no-console
      console.log("[mail] sent for", order.id);
    } catch (e) {
      console.error("[mail] failed for", order.id, e);
    }

    return j({ ok: true, orderId: order.id }, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create order." }, 500);
  }
}
