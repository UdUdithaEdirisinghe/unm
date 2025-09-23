import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

/**
 * Validate either a STORE CREDIT or a PROMO code.
 * Request:  POST { code: string, subtotal: number }
 * Success:  { valid:true, kind:"store_credit"|"promo", discount:number, freeShipping:boolean, promo:{code:string} }
 * Failure:  { valid:false, message:string }
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

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

    /* ---------- 1) Try STORE CREDIT first ---------- */
    const scRows = await sql/* sql */`
      SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
      FROM store_credits
      WHERE LOWER(code) = LOWER(${code})
      LIMIT 1
    `;

    if (scRows[0]) {
      const sc = scRows[0];
      const enabled = !!sc.enabled;
      const startsOk = !sc.starts_at || new Date(sc.starts_at) <= now;
      const endsOk   = !sc.ends_at   || new Date(sc.ends_at)   >= now;
      const notUsed  = !sc.used_at;
      const minOk    = sc.min_order_total == null || subtotal >= Number(sc.min_order_total);

      if (!enabled) return j({ valid: false, message: "This store credit is disabled." }, 400);
      if (!startsOk || !endsOk) return j({ valid: false, message: "This store credit is not active." }, 400);
      if (!notUsed) return j({ valid: false, message: "This store credit was already used." }, 400);
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
    }

    /* ---------- 2) Try PROMO ---------- */
    const pRows = await sql/* sql */`
      SELECT code, type, value, enabled, starts_at, ends_at
      FROM promos
      WHERE LOWER(code) = LOWER(${code})
      LIMIT 1
    `;

    if (!pRows[0]) {
      return j({ valid: false, message: "That code isn’t valid." }, 404);
    }

    const p = pRows[0];
    const enabled = !!p.enabled;
    const startsOk = !p.starts_at || new Date(p.starts_at) <= now;
    const endsOk   = !p.ends_at   || new Date(p.ends_at)   >= now;

    if (!enabled || !startsOk || !endsOk) {
      return j({ valid: false, message: "That code is disabled or expired." }, 400);
    }

    const t = String(p.type || "").toLowerCase(); // 'percent' | 'fixed' | 'freeshipping'
    let discount = 0;
    let freeShipping = false;

    if (t === "percent") {
      const pct = Math.max(0, Math.min(100, Number(p.value) || 0));
      discount = Math.floor((subtotal * pct) / 100);
    } else if (t === "fixed") {
      const val = Math.max(0, Number(p.value) || 0);
      discount = Math.min(subtotal, val);
    } else if (t === "freeshipping" || t === "free_shipping" || t === "free") {
      freeShipping = true;
    } else {
      return j({ valid: false, message: "Unsupported promotion type." }, 400);
    }

    return j({
      valid: true,
      kind: "promo",
      discount,
      freeShipping,
      promo: { code },
    });
  } catch (e: any) {
    return j({ valid: false, message: e?.message || "Validation failed." }, 500);
  }
}