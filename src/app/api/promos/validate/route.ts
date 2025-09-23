import { NextResponse } from "next/server";
import { computePromoDiscount, getPromo, validatePromoForOrder } from "../../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/** GET /api/promos/validate?code=SALE10&orderTotal=4890 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = String(searchParams.get("code") || "").toUpperCase().trim();
    const orderTotal = Number(searchParams.get("orderTotal") || 0);

    if (!code) return j({ valid: false, reason: "NO_CODE" }, 400);
    if (!Number.isFinite(orderTotal) || orderTotal < 0)
      return j({ valid: false, reason: "BAD_TOTAL" }, 400);

    const promo = await getPromo(code);
    const check = validatePromoForOrder(promo, orderTotal);

    if (!check.valid) return j({ valid: false, reason: check.reason });

    const { discount, freeShipping } = computePromoDiscount(promo!, orderTotal);
    return j({ valid: true, discount, freeShipping, promo: promo });
  } catch (e: any) {
    return j({ error: e?.message || "Validation failed." }, 500);
  }
}