// src/lib/promos.ts
import sql from "./db";

export type Promo = {
  code: string;
  type: "percent" | "fixed" | "freeShipping";
  value?: number | null;
  enabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

function mapPromo(row: any): Promo {
  return {
    code: String(row.code),
    type: row.type as Promo["type"],
    value:
      row.value === null || row.value === undefined ? null : Number(row.value),
    enabled: Boolean(row.enabled),
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
  };
}

export async function getPromoByCode(code: string): Promise<Promo | null> {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  const rows = await sql`
    SELECT code, type, value, enabled, starts_at, ends_at
    FROM promos WHERE code = ${c} LIMIT 1
  `;
  return rows[0] ? mapPromo(rows[0]) : null;
}

export async function listPromos(): Promise<Promo[]> {
  const rows = await sql`
    SELECT code, type, value, enabled, starts_at, ends_at
    FROM promos ORDER BY code ASC
  `;
  return rows.map(mapPromo);
}

export async function upsertPromo(p: Promo): Promise<Promo> {
  const val =
    p.type === "freeShipping" ? null : p.value ?? 0;

  const rows = await sql`
    INSERT INTO promos (code, type, value, enabled, starts_at, ends_at)
    VALUES (
      ${p.code.toUpperCase()},
      ${p.type},
      ${val},
      ${!!p.enabled},
      ${p.startsAt ? new Date(p.startsAt) : null},
      ${p.endsAt ? new Date(p.endsAt) : null}
    )
    ON CONFLICT (code) DO UPDATE SET
      type = EXCLUDED.type,
      value = EXCLUDED.value,
      enabled = EXCLUDED.enabled,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at
    RETURNING code, type, value, enabled, starts_at, ends_at
  `;
  return mapPromo(rows[0]);
}

export async function deletePromo(code: string): Promise<boolean> {
  const rows = await sql`DELETE FROM promos WHERE code = ${code.toUpperCase()} RETURNING code`;
  return !!rows[0];
}

export function isPromoActive(p: Promo): boolean {
  if (!p.enabled) return false;
  const now = Date.now();
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return false;
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return false;
  return true;
}

export function computeDiscount(
  p: Promo,
  subtotal: number
): { discount: number; freeShipping: boolean } {
  if (!isPromoActive(p)) return { discount: 0, freeShipping: false };

  let discount = 0;
  let freeShipping = false;

  if (p.type === "percent" && typeof p.value === "number") {
    discount = Math.floor(Math.max(0, subtotal) * (p.value / 100));
  } else if (p.type === "fixed" && typeof p.value === "number") {
    discount = Math.min(p.value, Math.max(0, subtotal));
  } else if (p.type === "freeShipping") {
    freeShipping = true;
  }

  return { discount, freeShipping };
}