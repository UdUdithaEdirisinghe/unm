import { NextResponse } from "next/server";
import { getStoreCredits, upsertStoreCredit, type StoreCredit } from "../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/** GET /api/store-credits */
export async function GET() {
  try {
    const items = await getStoreCredits();
    return j(items);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load store credits." }, 500);
  }
}

/** POST /api/store-credits (create) */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<StoreCredit>;

    const code = String(body.code || "").toUpperCase().trim();
    if (!code) return j({ error: "Code required." }, 400);

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return j({ error: "Amount must be a positive number." }, 400);
    }

    const saved = await upsertStoreCredit({
      code,
      amount,
      enabled: Boolean(body.enabled),
      minOrderTotal:
        body.minOrderTotal !== undefined && body.minOrderTotal !== null
          ? Number(body.minOrderTotal)
          : null,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      usedAt: null,
      usedOrderId: null,
    });

    return j(saved, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to save store credit." }, 500);
  }
}