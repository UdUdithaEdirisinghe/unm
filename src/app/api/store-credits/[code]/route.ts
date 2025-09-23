// src/app/api/store-credits/route.ts
import { NextResponse } from "next/server";
import {
  getStoreCredits,
  createStoreCredit,
} from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/store-credits
 * List all store credits
 */
export async function GET() {
  try {
    const credits = await getStoreCredits();
    return NextResponse.json(credits);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load store credits" }, { status: 500 });
  }
}

/**
 * POST /api/store-credits
 * Create a new store credit
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.code || !body.amount) {
      return NextResponse.json({ error: "Code and amount are required" }, { status: 400 });
    }

    const credit = await createStoreCredit({
      code: body.code,
      amount: Number(body.amount),
      enabled: body.enabled ?? true,
      minOrderTotal: body.minOrderTotal ?? null,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
    });

    return NextResponse.json(credit, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create store credit" }, { status: 500 });
  }
}