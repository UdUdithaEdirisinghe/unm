// Validate a promo (percent/fixed/freeShipping) for a given subtotal
import { NextResponse } from "next/server";
import { getPromoByCode, isPromoActive, computePromoDiscount } from "../../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** POST { code:string, subtotal:number } -> { valid, discount, freeShipping, promo, kind:'promo' } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.code ?? "").trim();
    const subtotal = Number(body?.subtotal ?? 0);

    if (!raw || !Number.isFinite(subtotal) || subtotal < 0) {
      return j({ valid: false, message: "Bad request." }, 400);
    }

    const promo = await getPromoByCode(raw);
    if (!promo || !isPromoActive(promo)) {
      return j({ valid: false, message: "That code isn’t valid or is inactive." }, 404);
    }

    const { discount, freeShipping } = computePromoDiscount(promo, subtotal);

    return j({
      valid: true,
      kind: "promo",
      discount,
      freeShipping,
      promo: { code: promo.code },
    });
  } catch (e: any) {
    return j({ valid: false, message: e?.message || "Validation failed." }, 500);
  }
}