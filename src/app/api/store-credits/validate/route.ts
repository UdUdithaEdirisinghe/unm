import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/**
 * Validate STORE CREDIT only
 * Request:  POST { code:string, subtotal:number }
 * Response: { valid:true, discount:number, freeShipping:false, kind:'store_credit', promo:{code} }
 * or       { valid:false, message }
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
    const now = new Date();

    const rows = await sql/* sql */`
      SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
      FROM store_credits
      WHERE LOWER(code) = LOWER(${code})
      LIMIT 1
    `;

    if (!rows[0]) {
      return j({ valid: false, message: "Store credit not found." }, 404);
    }

    const sc = rows[0];
    const enabled = !!sc.enabled;
    const startsOk = !sc.starts_at || new Date(sc.starts_at) <= now;
    const endsOk   = !sc.ends_at   || new Date(sc.ends_at)   >= now;
    const notUsed  = !sc.used_at;
    const minOk    = sc.min_order_total == null || subtotal >= Number(sc.min_order_total);

    if (!enabled) return j({ valid: false, message: "Disabled code." }, 400);
    if (!startsOk || !endsOk) return j({ valid: false, message: "Code not active." }, 400);
    if (!notUsed) return j({ valid: false, message: "Code already used." }, 400);
    if (!minOk)   return j({ valid: false, message: "Order total doesn’t meet the minimum." }, 400);

    const amt = Math.max(0, Number(sc.amount) || 0);
    const discount = Math.min(subtotal, amt);

    return j({
      valid: true,
      kind: "store_credit",
      discount,
      freeShipping: false,
      promo: { code },
    });
  } catch (e: any) {
    return j({ valid: false, message: e?.message || "Validation failed." }, 500);
  }
}