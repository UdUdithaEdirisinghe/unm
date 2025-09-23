import sql from "./db";

/** Server model */
export type PromoType = "percent" | "fixed" | "freeShipping";
export type Promo = {
  code: string;
  type: PromoType;
  value?: number | null;        // null/undefined for freeShipping
  enabled: boolean;
  startsAt?: string | null;     // ISO
  endsAt?: string | null;       // ISO
};

/** Map DB row -> Promo safely (no created_at assumptions) */
function rowToPromo(r: any): Promo {
  return {
    code: String(r.code).toUpperCase(),
    type: String(r.type) as PromoType,
    value: r.value === null || r.value === undefined ? null : Number(r.value),
    enabled: Boolean(r.enabled),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
  };
}

/** List all promos */
export async function getPromos(): Promise<Promo[]> {
  const rows = await sql`
    SELECT code, type, value, enabled, starts_at, ends_at
    FROM promos
    ORDER BY code ASC
  `;
  return rows.map(rowToPromo);
}

/** Get by code */
export async function getPromo(code: string): Promise<Promo | null> {
  const rows = await sql`
    SELECT code, type, value, enabled, starts_at, ends_at
    FROM promos
    WHERE code = ${code.toUpperCase()}
    LIMIT 1
  `;
  return rows[0] ? rowToPromo(rows[0]) : null;
}

/** Create or update (by code) */
export async function upsertPromo(p: Promo): Promise<Promo> {
  const code = p.code.toUpperCase();
  const val = p.type === "freeShipping" ? null : (p.value ?? 0);

  const rows = await sql`
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

/** Delete */
export async function deletePromo(code: string): Promise<boolean> {
  await sql`DELETE FROM promos WHERE code = ${code.toUpperCase()}`;
  return true;
}

/** Validate against time window, enabled, and order total (when type !== freeShipping). */
export function validatePromoForOrder(p: Promo | null, orderTotal: number): {
  valid: boolean;
  reason?: string;
} {
  if (!p) return { valid: false, reason: "NOT_FOUND" };
  if (!p.enabled) return { valid: false, reason: "DISABLED" };

  const now = Date.now();
  if (p.startsAt && now < new Date(p.startsAt).getTime()) {
    return { valid: false, reason: "NOT_STARTED" };
  }
  if (p.endsAt && now > new Date(p.endsAt).getTime()) {
    return { valid: false, reason: "EXPIRED" };
  }

  // No minimum order rule for promos in this build (store credits have it)
  // If you later add a min order rule for promos, check it here.

  // Nothing else disqualifies it
  return { valid: true };
}

/** Calculate discount amount (does not change validity). */
export function computePromoDiscount(p: Promo, orderTotal: number): {
  discount: number;
  freeShipping: boolean;
} {
  if (p.type === "freeShipping") return { discount: 0, freeShipping: true };
  if (p.type === "percent") {
    const pct = Math.max(0, Math.min(100, Number(p.value ?? 0)));
    return { discount: Math.floor((orderTotal * pct) / 100), freeShipping: false };
  }
  // fixed
  const amt = Math.max(0, Number(p.value ?? 0));
  return { discount: Math.min(orderTotal, amt), freeShipping: false };
}