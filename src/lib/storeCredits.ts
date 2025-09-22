// src/lib/storeCredits.ts
import sql from "./db";

export type StoreCredit = {
  code: string;               // UPPERCASE
  amount: number;             // LKR
  enabled: boolean;           // must be true to use
  minOrderTotal?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usedAt?: string | null;
  usedOrderId?: string | null;
};

export async function ensureStoreCreditsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS store_credits (
      code text PRIMARY KEY,
      amount numeric NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      min_order_total numeric,
      starts_at timestamptz,
      ends_at timestamptz,
      used_at timestamptz,
      used_order_id text
    );
  `;
}

function rowToCredit(r: any): StoreCredit {
  return {
    code: String(r.code),
    amount: Number(r.amount),
    enabled: !!r.enabled,
    minOrderTotal: r.min_order_total == null ? null : Number(r.min_order_total),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    usedAt: r.used_at ? new Date(r.used_at).toISOString() : null,
    usedOrderId: r.used_order_id ?? null,
  };
}

export async function listStoreCredits(): Promise<StoreCredit[]> {
  const rows = await sql`SELECT * FROM store_credits ORDER BY code ASC`;
  return rows.map(rowToCredit);
}

export async function getStoreCreditByCode(code: string): Promise<StoreCredit | null> {
  const rows = await sql`SELECT * FROM store_credits WHERE code = ${code.toUpperCase()} LIMIT 1`;
  return rows[0] ? rowToCredit(rows[0]) : null;
}

export async function upsertStoreCredit(c: StoreCredit): Promise<StoreCredit> {
  const rows = await sql`
    INSERT INTO store_credits
      (code, amount, enabled, min_order_total, starts_at, ends_at, used_at, used_order_id)
    VALUES
      (
        ${c.code.toUpperCase()},
        ${c.amount},
        ${c.enabled},
        ${c.minOrderTotal ?? null},
        ${c.startsAt ? new Date(c.startsAt) : null},
        ${c.endsAt ? new Date(c.endsAt) : null},
        ${c.usedAt ? new Date(c.usedAt) : null},
        ${c.usedOrderId ?? null}
      )
    ON CONFLICT (code) DO UPDATE SET
      amount = EXCLUDED.amount,
      enabled = EXCLUDED.enabled,
      min_order_total = EXCLUDED.min_order_total,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at
    RETURNING *;
  `;
  return rowToCredit(rows[0]);
}

export async function deleteStoreCredit(code: string): Promise<boolean> {
  // ✅ Use RETURNING to know if anything was deleted
  const rows = await sql`
    DELETE FROM store_credits
    WHERE code = ${code.toUpperCase()}
    RETURNING code
  `;
  return rows.length > 0;
}

export function isStoreCreditActive(c: StoreCredit, now = new Date()): boolean {
  if (!c.enabled) return false;
  if (c.usedAt) return false;
  const t = now.getTime();
  if (c.startsAt && t < new Date(c.startsAt).getTime()) return false;
  if (c.endsAt && t > new Date(c.endsAt).getTime()) return false;
  return true;
}

export function canApplyStoreCredit(
  c: StoreCredit,
  subtotal: number
): { ok: true } | { ok: false; reason: string } {
  if (!isStoreCreditActive(c)) return { ok: false, reason: "Inactive or already used." };
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, reason: "Empty subtotal." };
  if (c.minOrderTotal != null && subtotal < c.minOrderTotal)
    return { ok: false, reason: "Minimum order total not met." };
  if (subtotal < c.amount)
    return { ok: false, reason: "Order total must be equal to or greater than the store credit amount." };
  return { ok: true };
}

export async function markStoreCreditUsed(code: string, orderId: string) {
  await sql`
    UPDATE store_credits
    SET used_at = now(), used_order_id = ${orderId}
    WHERE code = ${code.toUpperCase()} AND used_at IS NULL
  `;
}