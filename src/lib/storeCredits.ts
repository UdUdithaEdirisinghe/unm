import sql from "./db";

export type StoreCredit = {
  code: string;
  amount: number;                 // LKR
  enabled: boolean;
  minOrderTotal?: number | null;  // optional LKR
  startsAt?: string | null;       // ISO
  endsAt?: string | null;         // ISO
  usedAt?: string | null;         // ISO
  usedOrderId?: string | null;
};

/** row -> model */
function rowToCredit(r: any): StoreCredit {
  return {
    code: String(r.code).toUpperCase(),
    amount: Number(r.amount),
    enabled: Boolean(r.enabled),
    minOrderTotal: r.min_order_total == null ? null : Number(r.min_order_total),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    usedAt: r.used_at ? new Date(r.used_at).toISOString() : null,
    usedOrderId: r.used_order_id ? String(r.used_order_id) : null,
  };
}

/** list */
export async function getStoreCredits(): Promise<StoreCredit[]> {
  const rows = await sql`
    SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
    FROM store_credits
    ORDER BY code ASC
  `;
  return rows.map(rowToCredit);
}

/** get */
export async function getStoreCredit(code: string): Promise<StoreCredit | null> {
  const rows = await sql`
    SELECT code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
    FROM store_credits
    WHERE code = ${code.toUpperCase()}
    LIMIT 1
  `;
  return rows[0] ? rowToCredit(rows[0]) : null;
}

/** upsert */
export async function upsertStoreCredit(c: StoreCredit): Promise<StoreCredit> {
  const code = c.code.toUpperCase();

  const rows = await sql`
    INSERT INTO store_credits (code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id)
    VALUES (${code}, ${c.amount}, ${c.enabled}, ${c.minOrderTotal ?? null}, ${c.startsAt ?? null}, ${c.endsAt ?? null}, ${c.usedAt ?? null}, ${c.usedOrderId ?? null})
    ON CONFLICT (code) DO UPDATE SET
      amount = EXCLUDED.amount,
      enabled = EXCLUDED.enabled,
      min_order_total = EXCLUDED.min_order_total,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at
    RETURNING code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id
  `;
  return rowToCredit(rows[0]);
}

/** delete (only when unused) */
export async function deleteStoreCredit(code: string): Promise<boolean> {
  await sql`DELETE FROM store_credits WHERE code = ${code.toUpperCase()} AND used_at IS NULL`;
  return true;
}

/** validation for checkout */
export function validateStoreCreditForOrder(c: StoreCredit | null, orderTotal: number): {
  valid: boolean;
  reason?: string;
  maxUsable?: number;
} {
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
  if (c.minOrderTotal && orderTotal < c.minOrderTotal) {
    return { valid: false, reason: "MIN_TOTAL" };
  }

  return { valid: true, maxUsable: Math.min(orderTotal, c.amount) };
}