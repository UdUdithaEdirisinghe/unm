import { NextResponse } from "next/server";
import { deleteStoreCredit, getStoreCredit, upsertStoreCredit, type StoreCredit } from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/** PUT /api/store-credits/:code */
export async function PUT(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = String(params.code || "").toUpperCase();
    if (!code) return j({ error: "Code required." }, 400);

    const existing = await getStoreCredit(code);
    if (!existing) return j({ error: "Not found." }, 404);
    if (existing.usedAt) return j({ error: "Already used; cannot modify." }, 400);

    const body = (await req.json()) as Partial<StoreCredit>;

    const saved = await upsertStoreCredit({
      code,
      amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
      enabled: body.enabled ?? existing.enabled,
      minOrderTotal:
        body.minOrderTotal !== undefined ? Number(body.minOrderTotal) : existing.minOrderTotal ?? null,
      startsAt: body.startsAt ?? existing.startsAt ?? null,
      endsAt: body.endsAt ?? existing.endsAt ?? null,
      usedAt: null,
      usedOrderId: null,
    });

    return j(saved);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update store credit." }, 500);
  }
}

/** DELETE /api/store-credits/:code  (only if unused) */
export async function DELETE(
  _req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = String(params.code || "").toUpperCase();
    if (!code) return j({ error: "Code required." }, 400);
    await deleteStoreCredit(code);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete store credit." }, 500);
  }
}