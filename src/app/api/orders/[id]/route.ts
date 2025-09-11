// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* ---------- helpers ---------- */
function toIsoDate(raw: any): string {
  const v =
    raw?.createdAt ??
    raw?.created_at ??
    raw?.created_at_iso ??
    raw?.created ??
    null;

  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n) && v.length >= 10) return new Date(n).toISOString();
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function parseMaybeJson<T = unknown>(v: any): T | undefined {
  if (v == null) return undefined;
  if (typeof v === "object") return v as T;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function coerceItems(raw: any): Array<any> {
  // items could be column 'items' or 'line_items', in json or text
  const v = raw?.items ?? raw?.line_items ?? null;
  if (!v) return [];
  const parsed = parseMaybeJson<any[]>(v);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(v)) return v;
  return [];
}

/* Merge priority: JSON.customer -> flat columns (JSON wins) */
function mapRowToOrder(row: any) {
  const customerJson = parseMaybeJson<any>(row?.customer) || {};

  // Base customer from flat columns
  const flatCustomer = {
    firstName:
      row.first_name ?? row.firstname ?? row.firstName ?? "",
    lastName:
      row.last_name ?? row.lastname ?? row.lastName ?? "",
    email: row.email ?? "",
    phone: row.phone ?? undefined,
    address: row.address ?? "",
    city: row.city ?? "",
    postal: row.postal ?? undefined,
    notes: row.notes ?? row.order_notes ?? undefined,
  };

  // Optional ship-to-different from flat columns
  const flatShipDiff =
    row.ship_to_different_address ||
    row.ship_to_different_city ||
    row.ship_to_different_name ||
    row.ship_to_different_phone ||
    row.ship_to_different_postal
      ? {
          name: row.ship_to_different_name ?? undefined,
          phone: row.ship_to_different_phone ?? undefined,
          address: row.ship_to_different_address ?? undefined,
          city: row.ship_to_different_city ?? undefined,
          postal: row.ship_to_different_postal ?? undefined,
        }
      : undefined;

  // If the JSON customer has a nested shipToDifferent, prefer/merge it
  const jsonShipDiff =
    customerJson.shipToDifferent ||
    customerJson.ship_to_different ||
    undefined;

  const shipToDifferent = {
    ...(flatShipDiff || {}),
    ...(jsonShipDiff || {}),
  };
  // remove empty shipToDifferent
  const hasShip =
    shipToDifferent &&
    Object.values(shipToDifferent).some((v) => v != null && String(v).trim() !== "");

  const customer = {
    ...flatCustomer,
    ...customerJson, // JSON wins if present
    shipToDifferent: hasShip ? shipToDifferent : undefined,
  };

  const items = coerceItems(row).map((it: any) => ({
    id: String(it.id ?? it.productId ?? it.sku ?? ""),
    name: String(it.name ?? ""),
    slug: String(it.slug ?? ""),
    price: Number(it.price ?? 0),
    quantity: Number(it.quantity ?? 0),
  }));

  return {
    id: String(row.id),
    createdAt: toIsoDate(row),
    status:
      row.status ??
      "pending",

    customer,

    items,

    subtotal: Number(row.subtotal ?? 0),
    shipping: Number(row.shipping ?? 0),
    total: Number(row.total ?? 0),

    promoCode: row.promo_code ?? row.promoCode ?? undefined,
    promoDiscount:
      row.promo_discount != null
        ? Number(row.promo_discount)
        : row.promoDiscount != null
        ? Number(row.promoDiscount)
        : undefined,
    freeShipping:
      row.free_shipping != null
        ? Boolean(row.free_shipping)
        : Boolean(row.freeShipping ?? false),

    paymentMethod: row.payment_method ?? row.paymentMethod ?? "COD",
    bankSlipName: row.bank_slip_name ?? row.bankSlipName ?? undefined,
    bankSlipUrl: row.bank_slip_url ?? row.bankSlipUrl ?? undefined,
  };
}

/* ---------- GET /api/orders/:id ---------- */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rows: any[] = await sql`SELECT * FROM orders WHERE id = ${params.id} LIMIT 1`;
    const row = rows?.[0];
    if (!row) return j({ error: "Order not found" }, 404);
    return j(mapRowToOrder(row));
  } catch (e: any) {
    console.error("[orders/:id GET]", e);
    return j({ error: e?.message || "Failed to read order" }, 500);
  }
}

/* ---------- PUT /api/orders/:id (status only) ---------- */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    const status = String(body?.status || "");
    const allowed = ["pending", "paid", "shipped", "completed", "cancelled"];
    if (!allowed.includes(status)) return j({ error: "Invalid status." }, 400);

    const rows: any[] = await sql`
      UPDATE orders SET status = ${status}
      WHERE id = ${params.id}
      RETURNING *
    `;
    const row = rows?.[0];
    if (!row) return j({ error: "Order not found" }, 404);
    return j(mapRowToOrder(row));
  } catch (e: any) {
    console.error("[orders/:id PUT]", e);
    return j({ error: e?.message || "Failed to update order" }, 500);
  }
}