// List & create/update store credits
import { NextResponse } from "next/server";
import {
  getStoreCredits,
  upsertStoreCredit,
  type StoreCredit,
} from "../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/store-credits -> StoreCredit[] */
export async function GET() {
  try {
    const rows = await getStoreCredits();
    return j(rows);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load store credits." }, 500);
  }
}

/** POST /api/store-credits -> create or overwrite */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<StoreCredit>;
    const code = String(body.code || "").trim().toUpperCase();
    const amount = Number(body.amount ?? 0);
    const enabled = Boolean(body.enabled);
    const minOrderTotal =
      body.minOrderTotal == null ? null : Number(body.minOrderTotal);
    const startsAt = body.startsAt ?? null;
    const endsAt = body.endsAt ?? null;

    if (!code || !Number.isFinite(amount) || amount <= 0) {
      return j({ error: "Missing/invalid fields: code, amount." }, 400);
    }

    const saved = await upsertStoreCredit({
      code,
      amount,
      enabled,
      minOrderTotal,
      startsAt,
      endsAt,
      usedAt: null,
      usedOrderId: null,
    });
    return j(saved, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to save store credit." }, 500);
  }
}