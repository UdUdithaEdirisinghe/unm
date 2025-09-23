// src/app/api/promos/validate/route.ts
import { NextResponse } from "next/server";
import {
  getPromoByCode,
  isPromoActive,
  computePromoDiscount,
} from "../../../../lib/promos";
import {
  getStoreCredit,
  validateStoreCreditForOrder,
} from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/**
 * Unified validator:
 * POST { code:string, subtotal:number }
 * -> { valid:boolean, discount:number, freeShipping:boolean, promo:{code}, kind:'promo'|'store_credit' }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.code ?? "").trim();
    const subtotal = Number(body?.subtotal ?? 0);

    if (!raw || !Number.isFinite(subtotal) || subtotal < 0) {
      return j({ valid: false, message: "Bad request." }, 400);
    }

    const code = raw.toUpperCase();

    /* ---------- 1) Try PROMO ---------- */
    const promo = await getPromoByCode(code);
    if (promo && isPromoActive(promo)) {
      const { discount, freeShipping } = computePromoDiscount(promo, subtotal);
      return j({
        valid: true,
        kind: "promo",
        discount: Number(discount || 0),
        freeShipping: !!freeShipping,
        promo: { code: promo.code },
      });
    }

    /* ---------- 2) Try STORE CREDIT ---------- */
    const sc = await getStoreCredit(code);
    const verdict = validateStoreCreditForOrder(sc, subtotal);
    if (verdict.valid) {
      // discount is capped by subtotal; verdict.maxUsable already accounts for that
      const discount = Math.min(subtotal, Number(verdict.maxUsable || 0));
      return j({
        valid: true,
        kind: "store_credit",
        discount,
        freeShipping: false,
        promo: { code: sc!.code },
      });
    }

    // Neither promo nor store credit valid
    return j(
      { valid: false, message: "That code isn’t valid or has expired." },
      404
    );
  } catch (e: any) {
    return j({ valid: false, message: e?.message || "Validation failed." }, 500);
  }
}