// src/app/api/promos/validate/route.ts
import { NextResponse } from "next/server";
import { getPromoByCode, isPromoActive, computeDiscount } from "../../../../lib/promos";
import sql from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();

    const c = String(code || "").trim().toUpperCase();
    const sub = Number(subtotal) || 0;
    if (!c) return j({ valid: false, error: "Missing promo code." }, 400);

    // 1) Try standard PROMO first
    const promo = await getPromoByCode(c);
    if (promo && isPromoActive(promo)) {
      const { discount, freeShipping } = computeDiscount(promo, sub);
      return j({
        valid: true,
        code: promo.code,
        discount,
        freeShipping,
        promo,          // present for backward-compat with your UI
        type: "promo",
      });
    }

    // 2) If not a promo, try STORE CREDIT
    const rows: any[] = await sql`
      SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_order_id
      FROM store_credits
      WHERE code = ${c}
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

    if (!active) {
      return j({ valid: false, error: "Invalid or inactive promo." }, 400);
    }

    const minOrder = Number(sc.min_order_total || 0);
    if (sub <= 0 || sub < minOrder) {
      return j({
        valid: false,
        error:
          minOrder > 0
            ? `Minimum order total must be LKR ${minOrder.toLocaleString()}`
            : "Empty subtotal.",
      }, 400);
    }

    const amount = Math.max(0, Number(sc.amount || 0));
    const discount = Math.min(amount, sub); // cannot exceed subtotal

    return j({
      valid: true,
      code: sc.code,
      discount,
      freeShipping: false,
      promo: null,                 // keep shape your UI expects
      storeCredit: {
        code: sc.code,
        amount,
        minOrderTotal: minOrder,
        startsAt: sc.starts_at,
        endsAt: sc.ends_at,
      },
      type: "storeCredit",
    });
  } catch (e: any) {
    return j({ valid: false, error: e?.message || "Validation failed." }, 500);
  }
}