import { NextResponse } from "next/server";
import { readPromos, isPromoActive, computeDiscount } from "../../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function POST(req: Request) {
  const { code, subtotal } = await req.json();
  const list = await readPromos();

  const promo = list.find(
    (p) => p.code === String(code || "").toUpperCase()
  );

  if (!promo) return j({ valid: false, message: "Invalid code." });
  if (!isPromoActive(promo))
    return j({ valid: false, message: "This code is not active." });

  const { discount, freeShipping } = computeDiscount(
    promo,
    Number(subtotal) || 0
  );

  return j({ valid: true, discount, freeShipping });
}