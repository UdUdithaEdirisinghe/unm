// src/lib/storeCredits.ts
import sql from "./db";

/** Store credit shape */
export type StoreCredit = {
  code: string;
  amount: number;
  enabled: boolean;
  minOrderTotal?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usedAt?: string | null;
  usedOrderId?: string | null;
  createdAt?: string;
};

/* ---------- Helpers ---------- */
function rowToStoreCredit(r: any): StoreCredit {
  return {
    code: String(r.code).toUpperCase(),
    amount: Number(r.amount ?? 0),
    enabled: !!r.enabled,
    minOrderTotal: r.min_order_total == null ? null : Number(r.min_order_total),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    usedAt: r.used_at ? new Date(r.used_at).toISOString() : null,
    usedOrderId: r.used_order_id ?? null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  };
}

/* ---------- Queries ---------- */
export async function getStoreCredits(): Promise<StoreCredit[]> {
  const rows = await sql`
    SELECT code, amount, enabled, min_order_total, starts_at, ends_at,
           used_at, used_order_id, created_at
    FROM store_credits
    ORDER BY created_at DESC, code ASC
  `;
  return rows.map(rowToStoreCredit);
}

export async function getStoreCreditByCode(code: string): Promise<StoreCredit | null> {
  const c = String(code || "").toUpperCase();
  if (!c) return null;
  const rows = await sql`
    SELECT code, amount, enabled, min_order_total, starts_at, ends_at,
           used_at, used_order_id, created_at
    FROM store_credits
    WHERE UPPER(code) = ${c}
    LIMIT 1
  `;
  return rows[0] ? rowToStoreCredit(rows[0]) : null;
}

export async function createStoreCredit(input: {
  code: string;
  amount: number;
  enabled?: boolean;
  minOrderTotal?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<StoreCredit> {
  const code = String(input.code || "").toUpperCase();
  const amount = Number(input.amount || 0);
  const enabled = input.enabled !== false;
  const min = input.minOrderTotal == null ? null : Number(input.minOrderTotal);
  const starts = input.startsAt ? new Date(input.startsAt).toISOString() : null;
  const ends = input.endsAt ? new Date(input.endsAt).toISOString() : null;

  const rows = await sql`
    INSERT INTO store_credits
      (code, amount, enabled, min_order_total, starts_at, ends_at)
    VALUES
      (${code}, ${amount}, ${enabled}, ${min}, ${starts}, ${ends})
    RETURNING code, amount, enabled, min_order_total, starts_at, ends_at,
              used_at, used_order_id, created_at
  `;
  return rowToStoreCredit(rows[0]);
}

export async function updateStoreCredit(
  code: string,
  patch: {
    amount?: number;
    enabled?: boolean;
    minOrderTotal?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
  }
): Promise<StoreCredit | null> {
  const c = String(code || "").toUpperCase();
  const current = await getStoreCreditByCode(c);
  if (!current) return null;

  const rows = await sql`
    UPDATE store_credits SET
      amount = ${patch.amount ?? current.amount},
      enabled = ${patch.enabled ?? current.enabled},
      min_order_total = ${patch.minOrderTotal ?? current.minOrderTotal},
      starts_at = ${patch.startsAt ?? current.startsAt},
      ends_at = ${patch.endsAt ?? current.endsAt}
    WHERE UPPER(code) = ${c}
    RETURNING code, amount, enabled, min_order_total, starts_at, ends_at,
              used_at, used_order_id, created_at
  `;
  return rows[0] ? rowToStoreCredit(rows[0]) : null;
}

export async function deleteStoreCredit(code: string): Promise<boolean> {
  const c = String(code || "").toUpperCase();
  await sql`DELETE FROM store_credits WHERE UPPER(code) = ${c}`;
  return true;
}

export async function markStoreCreditUsed(code: string, orderId: string): Promise<StoreCredit | null> {
  const c = String(code || "").toUpperCase();
  const now = new Date().toISOString();
  const rows = await sql`
    UPDATE store_credits SET
      used_at = ${now},
      used_order_id = ${orderId}
    WHERE UPPER(code) = ${c}
    RETURNING code, amount, enabled, min_order_total, starts_at, ends_at,
              used_at, used_order_id, created_at
  `;
  return rows[0] ? rowToStoreCredit(rows[0]) : null;
}

export async function unuseStoreCredit(code: string): Promise<StoreCredit | null> {
  const c = String(code || "").toUpperCase();
  const rows = await sql`
    UPDATE store_credits SET
      used_at = NULL,
      used_order_id = NULL
    WHERE UPPER(code) = ${c}
    RETURNING code, amount, enabled, min_order_total, starts_at, ends_at,
              used_at, used_order_id, created_at
  `;
  return rows[0] ? rowToStoreCredit(rows[0]) : null;
}

/* ---------- Validation ---------- */
export function evaluateStoreCredit(
  credit: StoreCredit,
  subtotal: number
): { valid: boolean; reason?: string; discount: number } {
  const now = new Date();

  if (!credit.enabled) return { valid: false, reason: "Disabled", discount: 0 };
  if (credit.startsAt && new Date(credit.startsAt) > now)
    return { valid: false, reason: "Not active yet", discount: 0 };
  if (credit.endsAt && new Date(credit.endsAt) < now)
    return { valid: false, reason: "Expired", discount: 0 };
  if (credit.usedAt)
    return { valid: false, reason: "Already used", discount: 0 };

  const subTotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;
  if (credit.minOrderTotal && subTotal < credit.minOrderTotal) {
    return {
      valid: false,
      reason: `Min order total is ${credit.minOrderTotal}`,
      discount: 0,
    };
  }

  const discount = Math.min(credit.amount, subTotal);
  return { valid: discount > 0, discount };
}