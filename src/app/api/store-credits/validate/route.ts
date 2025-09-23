// Validate a store credit for a given subtotal
import { NextResponse } from "next/server";
import { getStoreCredit, validateStoreCreditForOrder } from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** POST { code:string, subtotal:number } -> { valid, discount, freeShipping:false, promo:{code}, kind:'store_credit' } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.code ?? "").trim();
    const subtotal = Number(body?.subtotal ?? 0);

    if (!raw || !Number.isFinite(subtotal) || subtotal < 0) {
      return j({ valid: false, message: "Bad request." }, 400);
    }

    const sc = await getStoreCredit(raw);
    const verdict = validateStoreCreditForOrder(sc, subtotal);
    if (!verdict.valid) {
      return j({ valid: false, message: "This store credit cannot be used." }, 400);
    }

    const discount = Math.min(subtotal, verdict.maxUsable ?? 0);

    return j({
      valid: true,
      kind: "store_credit",
      discount,
      freeShipping: false,
      promo: { code: sc!.code },
    });
  } catch (e: any) {
    return j({ valid: false, message: e?.message || "Validation failed." }, 500);
  }
}