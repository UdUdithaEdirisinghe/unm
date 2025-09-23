// src/lib/promos.ts
import sql from "./db";

/** Promo model */
export type PromoType = "percent" | "fixed" | "freeShipping";
export type Promo = {
  code: string;             // UPPERCASE for consistency
  type: PromoType;
  value?: number | null;    // null/undefined for freeShipping
  enabled: boolean;
  startsAt?: string | null; // ISO
  endsAt?: string | null;   // ISO
};

/* ----------------- helpers ----------------- */
const up = (s: string) => s.toUpperCase();
const n = (v: any, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};

function rowToPromo(r: any): Promo {
  return {
    code: up(String(r.code)),
    type: String(r.type) as PromoType,
    value: r.value == null ? null : n(r.value),
    enabled: Boolean(r.enabled),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  };
}

/* ----------------- queries ----------------- */

/** List all promos. */
export async function getPromos(): Promise<Promo[]> {
  const rows = await sql/* sql */`
    SELECT code, type, value, enabled, starts_at, ends_at
    FROM promos
    ORDER BY code ASC
  `;
  return rows.map(rowToPromo);
}

/** Get one promo by code (case-insensitive). */
export async function getPromoByCode(code: string): Promise<Promo | null> {
  const rows = await sql/* sql */`
    SELECT code, type, value, enabled, starts_at, ends_at
    FROM promos
    WHERE LOWER(code) = LOWER(${code})
    LIMIT 1
  `;
  return rows[0] ? rowToPromo(rows[0]) : null;
}

/** Create or update promo (by code). */
export async function upsertPromo(p: Promo): Promise<Promo> {
  const code = up(p.code);
  const val = p.type === "freeShipping" ? null : (p.value ?? 0);

  const rows = await sql/* sql */`
    INSERT INTO promos (code, type, value, enabled, starts_at, ends_at)
    VALUES (${code}, ${p.type}, ${val}, ${p.enabled}, ${p.startsAt ?? null}, ${p.endsAt ?? null})
    ON CONFLICT (code) DO UPDATE SET
      type = EXCLUDED.type,
      value = EXCLUDED.value,
      enabled = EXCLUDED.enabled,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at
    RETURNING code, type, value, enabled, starts_at, ends_at
  `;
  return rowToPromo(rows[0]);
}

/** Delete promo by code. */
export async function deletePromo(code: string): Promise<boolean> {
  await sql/* sql */`
    DELETE FROM promos WHERE LOWER(code) = LOWER(${code})
  `;
  return true;
}

/* ----------------- validation ----------------- */

/** Is promo enabled and within date range? */
export function isPromoActive(p: Promo | null): boolean {
  if (!p) return false;
  if (!p.enabled) return false;

  const now = Date.now();
  if (p.startsAt && now < new Date(p.startsAt).getTime()) return false;
  if (p.endsAt && now > new Date(p.endsAt).getTime()) return false;

  return true;
}

/**
 * Calculate discount/free shipping for an order total.
 * Always returns a valid object, even if discount = 0.
 */
export function computePromoDiscount(
  p: Promo,
  orderTotal: number
): { discount: number; freeShipping: boolean } {
  if (p.type === "freeShipping") {
    return { discount: 0, freeShipping: true };
  }
  if (p.type === "percent") {
    const pct = Math.max(0, Math.min(100, n(p.value, 0)));
    return {
      discount: Math.floor((orderTotal * pct) / 100),
      freeShipping: false,
    };
  }
  // fixed
  const amt = Math.max(0, n(p.value, 0));
  return { discount: Math.min(orderTotal, amt), freeShipping: false };
}