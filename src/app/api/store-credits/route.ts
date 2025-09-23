import { NextResponse } from "next/server";
import { getStoreCredits, createStoreCredit, type StoreCredit } from "../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) =>
  NextResponse.json(data, { status });

export async function GET() {
  try {
    const credits = await getStoreCredits();
    return j(credits);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load store credits." }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<StoreCredit>;

    const code = String(body.code || "").trim().toUpperCase();
    const amount = Number(body.amount || 0);
    const enabled = Boolean(body.enabled);

    if (!code || !Number.isFinite(amount) || amount <= 0) {
      return j({ error: "Missing/invalid fields: code, amount." }, 400);
    }

    const created = await createStoreCredit({
      code,
      amount,
      enabled,
      minOrderTotal: body.minOrderTotal ?? null,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
    } as StoreCredit);

    return j(created, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create store credit." }, 500);
  }
}