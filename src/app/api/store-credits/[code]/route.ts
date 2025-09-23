// Read/Update/Delete a single store credit by code
import { NextResponse } from "next/server";
import {
  getStoreCredit,
  upsertStoreCredit,
  deleteStoreCredit,
  type StoreCredit,
} from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/store-credits/:code */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const row = await getStoreCredit(params.code);
    if (!row) return j({ error: "Not found" }, 404);
    return j(row);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to read store credit." }, 500);
  }
}

/** PUT /api/store-credits/:code */
export async function PUT(req: Request, { params }: { params: { code: string } }) {
  try {
    const current = await getStoreCredit(params.code);
    if (!current) return j({ error: "Not found" }, 404);

    const body = (await req.json().catch(() => ({}))) as Partial<StoreCredit>;

    const amount =
      body.amount == null ? current.amount : Number(body.amount);
    const enabled = body.enabled == null ? current.enabled : Boolean(body.enabled);
    const minOrderTotal =
      body.minOrderTotal == null ? current.minOrderTotal : Number(body.minOrderTotal);
    const startsAt = body.startsAt ?? current.startsAt ?? null;
    const endsAt = body.endsAt ?? current.endsAt ?? null;

    // keep usage flags if already used
    const usedAt = current.usedAt ?? null;
    const usedOrderId = current.usedOrderId ?? null;

    const saved = await upsertStoreCredit({
      code: current.code,
      amount,
      enabled,
      minOrderTotal,
      startsAt,
      endsAt,
      usedAt,
      usedOrderId,
    });

    return j(saved);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update store credit." }, 500);
  }
}

/** DELETE /api/store-credits/:code (only if unused) */
export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  try {
    await deleteStoreCredit(params.code);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete store credit." }, 500);
  }
}