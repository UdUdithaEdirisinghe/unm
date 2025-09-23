// src/lib/storeCredits.ts
import sql from "./db";

export type StoreCredit = {
  code: string;                  // UPPERCASE display
  amount: number;                // LKR
  enabled: boolean;
  minOrderTotal?: number | null; // optional LKR
  startsAt?: string | null;      // ISO
  endsAt?: string | null;        // ISO
  usedAt?: string | null;        // ISO
  usedOrderId?: string | null;
};

/* ----------------- helpers ----------------- */
const up = (s: string) => s.toUpperCase();
const n = (v: any, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};

function rowToCredit(r: any): StoreCredit {
  return {
    code: up(String(r.code)),
    amount: n(r.amount),
    enabled: Boolean(r.enabled),
    minOrderTotal: r.min_order_total == null ? null : n(r.min_order_total),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    usedAt: r.used_at ? new Date(r.used_at).toISOString() : null,
    usedOrderId: r.used_order_id ? String(r.used_order_id) : null,
  };
}

/* ----------------- queries ----------------- */

/** List all store credits. */
export async function getStoreCredits(): Promise<StoreCredit[]> {
  const rows = await sql/* sql */`
    SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
    FROM store_credits
    ORDER BY code ASC
  `;
  return rows.map(rowToCredit);
}

/** Get a single store credit by code (case-insensitive). */
export async function getStoreCredit(code: string): Promise<StoreCredit | null> {
  const rows = await sql/* sql */`
    SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
    FROM store_credits
    WHERE LOWER(code) = LOWER(${code})
    LIMIT 1
  `;
  return rows[0] ? rowToCredit(rows[0]) : null;
}

/**
 * Create or update a store credit by code.
 * Always returns a StoreCredit (uses RETURNING).
 */
export async function upsertStoreCredit(c: StoreCredit): Promise<StoreCredit> {
  const code = up(c.code);

  const rows = await sql/* sql */`
    INSERT INTO store_credits (
      code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
    )
    VALUES (
      ${code}, ${n(c.amount)}, ${!!c.enabled},
      ${c.minOrderTotal ?? null},
      ${c.startsAt ?? null},
      ${c.endsAt ?? null},
      ${c.usedAt ?? null},
      ${c.usedOrderId ?? null}
    )
    ON CONFLICT (code) DO UPDATE SET
      amount          = EXCLUDED.amount,
      enabled         = EXCLUDED.enabled,
      min_order_total = EXCLUDED.min_order_total,
      starts_at       = EXCLUDED.starts_at,
      ends_at         = EXCLUDED.ends_at
    RETURNING code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
  `;

  // RETURNING guarantees rows[0]
  return rowToCredit(rows[0]);
}

/**
 * Delete a store credit (only if not used).
 * Returns true even if nothing matched (idempotent, safe for UI).
 */
export async function deleteStoreCredit(code: string): Promise<boolean> {
  await sql/* sql */`
    DELETE FROM store_credits
    WHERE LOWER(code) = LOWER(${code}) AND used_at IS NULL
  `;
  return true;
}

/* ----------------- checkout validation ----------------- */

/**
 * Validate a store credit for an order total.
 * Returns validity, a reason when invalid, and maxUsable when valid.
 */
export function validateStoreCreditForOrder(
  c: StoreCredit | null,
  orderTotal: number
): { valid: boolean; reason?: string; maxUsable?: number } {
  if (!c) return { valid: false, reason: "NOT_FOUND" };
  if (!c.enabled) return { valid: false, reason: "DISABLED" };
  if (c.usedAt) return { valid: false, reason: "ALREADY_USED" };

  const now = Date.now();
  if (c.startsAt && now < new Date(c.startsAt).getTime()) {
    return { valid: false, reason: "NOT_STARTED" };
  }
  if (c.endsAt && now > new Date(c.endsAt).getTime()) {
    return { valid: false, reason: "EXPIRED" };
  }
  if (c.minOrderTotal != null && orderTotal < c.minOrderTotal) {
    return { valid: false, reason: "MIN_TOTAL" };
  }

  const maxUsable = Math.min(Math.max(0, orderTotal), Math.max(0, c.amount));
  return { valid: true, maxUsable };
}