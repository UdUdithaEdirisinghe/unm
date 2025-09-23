import sql from "./db";

export type PromoType = "percent" | "fixed" | "freeShipping";

export type Promo = {
  code: string;                 // UPPERCASE
  type: PromoType;
  value?: number | null;        // null for freeShipping
  enabled: boolean;
  startsAt?: string | null;     // ISO
  endsAt?: string | null;       // ISO
  createdAt?: string;
};

function rowToPromo(r: any): Promo {
  return {
    code: String(r.code),
    type: String(r.type) as PromoType,
    value: r.value === null || r.value === undefined ? null : Number(r.value),
    enabled: Boolean(r.enabled),
    startsAt: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  };
}

export async function getPromos(): Promise<Promo[]> {
  const rows = await sql`
    SELECT code, type, value, enabled, starts_at, ends_at, created_at
    FROM promos
    ORDER BY created_at DESC, code ASC
  `;
  return rows.map(rowToPromo);
}

export async function getPromoByCode(code: string): Promise<Promo | null> {
  const rows = await sql`
    SELECT code, type, value, enabled, starts_at, ends_at, created_at
    FROM promos
    WHERE code = ${code}
    LIMIT 1
  `;
  return rows[0] ? rowToPromo(rows[0]) : null;
}

/** Create. Fails if code exists. */
export async function createPromo(p: Promo): Promise<Promo> {
  const rows = await sql`
    INSERT INTO promos (code, type, value, enabled, starts_at, ends_at)
    VALUES (
      ${p.code},
      ${p.type},
      ${p.type === "freeShipping" ? null : (p.value ?? 0)},
      ${p.enabled},
      ${p.startsAt ? new Date(p.startsAt) : null},
      ${p.endsAt ? new Date(p.endsAt) : null}
    )
    RETURNING code, type, value, enabled, starts_at, ends_at, created_at
  `;
  return rowToPromo(rows[0]);
}

/** Update existing by code. */
export async function updatePromo(code: string, patch: Partial<Promo>): Promise<Promo | null> {
  const prev = await getPromoByCode(code);
  if (!prev) return null;

  const next: Promo = {
    ...prev,
    ...patch,
    code: prev.code, // code is immutable key
    value: (patch.type ?? prev.type) === "freeShipping"
      ? null
      : (patch.value !== undefined ? patch.value : prev.value ?? 0),
    startsAt: patch.startsAt === undefined ? prev.startsAt : patch.startsAt,
    endsAt: patch.endsAt === undefined ? prev.endsAt : patch.endsAt,
  };

  const rows = await sql`
    UPDATE promos SET
      type = ${next.type},
      value = ${next.type === "freeShipping" ? null : (next.value ?? 0)},
      enabled = ${next.enabled},
      starts_at = ${next.startsAt ? new Date(next.startsAt) : null},
      ends_at = ${next.endsAt ? new Date(next.endsAt) : null}
    WHERE code = ${code}
    RETURNING code, type, value, enabled, starts_at, ends_at, created_at
  `;
  return rows[0] ? rowToPromo(rows[0]) : null;
}

export async function deletePromo(code: string): Promise<boolean> {
  const res = await sql`DELETE FROM promos WHERE code = ${code}`;
  // @ts-ignore: res.count exists on postgres client drivers
  return (res.count ?? res.rowCount ?? 0) > 0;
}

// ---- Add this helper to the bottom of src/lib/promos.ts ----
export function evaluatePromo(
  promo: Promo,
  subtotal: number
): {
  valid: boolean;
  reason?: string;
  discount: number;
  freeShipping: boolean;
} {
  const now = new Date();

  if (!promo.enabled) {
    return { valid: false, reason: "Promo is disabled.", discount: 0, freeShipping: false };
  }

  if (promo.startsAt && new Date(promo.startsAt) > now) {
    return { valid: false, reason: "Promo not active yet.", discount: 0, freeShipping: false };
  }
  if (promo.endsAt && new Date(promo.endsAt) < now) {
    return { valid: false, reason: "Promo has expired.", discount: 0, freeShipping: false };
  }

  const sub = Number.isFinite(subtotal) ? Math.max(0, Number(subtotal)) : 0;

  if (promo.type === "freeShipping") {
    return { valid: true, discount: 0, freeShipping: true };
  }

  if (promo.type === "percent") {
    const pct = Math.max(0, Number(promo.value ?? 0));
    const discount = Math.floor(sub * (pct / 100));
    return { valid: discount > 0, discount, freeShipping: false, reason: discount > 0 ? undefined : "Subtotal too low." };
  }

  if (promo.type === "fixed") {
    const amt = Math.max(0, Number(promo.value ?? 0));
    const discount = Math.min(amt, sub);
    return { valid: discount > 0, discount, freeShipping: false, reason: discount > 0 ? undefined : "Subtotal too low." };
  }

  return { valid: false, reason: "Invalid promo type.", discount: 0, freeShipping: false };
}