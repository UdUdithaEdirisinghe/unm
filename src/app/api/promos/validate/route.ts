// src/app/api/promos/validate/route.ts
import { NextResponse } from "next/server";
import { getPromoByCode, isPromoActive, computeDiscount } from "../../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();

    const c = String(code || "").trim().toUpperCase();
    const sub = Number(subtotal) || 0;

    if (!c) return j({ valid: false, error: "Missing promo code." }, 400);

    const promo = await getPromoByCode(c);
    if (!promo || !isPromoActive(promo)) {
      return j({ valid: false, error: "Invalid or inactive promo." }, 400);
    }

    const { discount, freeShipping } = computeDiscount(promo, sub);
    return j({ valid: true, discount, freeShipping, promo });
  } catch (e: any) {
    return j({ valid: false, error: e?.message || "Validation failed." }, 500);
  }
}