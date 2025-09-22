// src/app/api/store-credits/validate/route.ts
import { NextResponse } from "next/server";
import { canApplyStoreCredit, getStoreCreditByCode, isStoreCreditActive } from "../../../../lib/storeCredits";

const j = (d:any, s=200) => NextResponse.json(d, { status:s });

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();
    const c = String(code || "").trim().toUpperCase();
    const sub = Number(subtotal) || 0;
    if (!c) return j({ valid:false, error:"Missing code." }, 400);

    const sc = await getStoreCreditByCode(c);
    if (!sc || !isStoreCreditActive(sc)) return j({ valid:false, error:"Invalid or inactive store credit." }, 400);

    const ok = canApplyStoreCredit(sc, sub);
    if (!ok.ok) return j({ valid:false, error: ok.reason }, 400);

    return j({ valid:true, amount: sc.amount, minOrderTotal: sc.minOrderTotal ?? null, storeCredit: sc });
  } catch (e:any) {
    return j({ valid:false, error: e?.message || "Validation failed." }, 500);
  }
}