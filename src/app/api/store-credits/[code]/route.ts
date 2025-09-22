// src/app/api/store-credits/[code]/route.ts
import { NextResponse } from "next/server";
import { deleteStoreCredit, getStoreCreditByCode, upsertStoreCredit, type StoreCredit } from "../../../../lib/storeCredits";

const j = (d:any, s=200) => NextResponse.json(d, { status:s });

export async function GET(_req: Request, { params }: { params:{ code:string } }) {
  const sc = await getStoreCreditByCode(params.code);
  if (!sc) return j({ error:"Not found" }, 404);
  return j(sc);
}

export async function PUT(req: Request, { params }: { params:{ code:string } }) {
  try {
    const body = (await req.json()) as Partial<StoreCredit>;
    const saved = await upsertStoreCredit({
      code: params.code.toUpperCase(),
      amount: Number(body.amount ?? 0),
      enabled: body.enabled ?? true,
      minOrderTotal: body.minOrderTotal == null ? null : Number(body.minOrderTotal),
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      usedAt: body.usedAt ?? null,
      usedOrderId: body.usedOrderId ?? null,
    });
    return j(saved);
  } catch (e:any) {
    return j({ error: e?.message || "Failed to update store credit." }, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params:{ code:string } }) {
  try {
    const ok = await deleteStoreCredit(params.code);
    if (!ok) return j({ error:"Not found" }, 404);
    return j({ ok:true });
  } catch (e:any) {
    return j({ error: e?.message || "Failed to delete store credit." }, 500);
  }
}