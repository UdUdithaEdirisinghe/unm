// src/app/api/store-credits/route.ts
import { NextResponse } from "next/server";
import { listStoreCredits, upsertStoreCredit, type StoreCredit } from "../../../lib/storeCredits";

const j = (d:any, s=200) => NextResponse.json(d, { status:s });

export async function GET() {
  try {
    const rows = await listStoreCredits();
    return j(rows);
  } catch (e:any) {
    return j({ error: e?.message || "Failed to load store credits." }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<StoreCredit>;
    if (!body.code || !body.amount) return j({ error:"code and amount are required" }, 400);
    const saved = await upsertStoreCredit({
      code: String(body.code).toUpperCase(),
      amount: Number(body.amount),
      enabled: body.enabled ?? true,
      minOrderTotal: body.minOrderTotal == null ? null : Number(body.minOrderTotal),
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      usedAt: null,
      usedOrderId: null,
    });
    return j(saved, 201);
  } catch (e:any) {
    return j({ error: e?.message || "Failed to save store credit." }, 500);
  }
}