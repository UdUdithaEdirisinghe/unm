import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

/**
 * One endpoint that validates EITHER a store credit OR a promo.
 * Tables used (based on your screenshots):
 *   - public.store_credits: code(text), amount(numeric), enabled(bool),
 *       min_order_total(numeric|null), starts_at(timestamptz|null),
 *       ends_at(timestamptz|null), used_at(timestamptz|null), used_order_id(text|null)
 *   - public.promos: code(text), type(text: 'percent'|'fixed'|'freeshipping'),
 *       value(integer|null), enabled(bool), starts_at(timestamptz|null), ends_at(timestamptz|null)
 *
 * Request body: { code: string, subtotal: number }
 * Response on success (either kind):
 *   { valid:true, discount:number, freeShipping:boolean, promo:{code:string}, kind:'promo'|'store_credit' }
 * Response on failure:
 *   { valid:false, message:string }
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) =>
  NextResponse.json(data, { status });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.code ?? "").trim();
    const subtotal = Number(body?.subtotal ?? 0);

    if (!raw || !Number.isFinite(subtotal) || subtotal < 0) {
      return j({ valid: false, message: "Bad request." }, 400);
    }

    // Case-insensitive compare – normalize to UPPER for display, but match by LOWER in SQL.
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
      const endsOk = !sc.ends_at || new Date(sc.ends_at) >= now;
      const notUsed = !sc.used_at;
      const minOk =
        sc.min_order_total == null || Number(subtotal) >= Number(sc.min_order_total);

      if (enabled && startsOk && endsOk && notUsed && minOk) {
        // discount is the credit amount, capped at subtotal
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
      return j({ valid: false, message: "This store credit cannot be used." }, 400);
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
    const endsOk = !p.ends_at || new Date(p.ends_at) >= now;
    if (!enabled || !startsOk || !endsOk) {
      return j({ valid: false, message: "That code has expired or is disabled." }, 400);
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