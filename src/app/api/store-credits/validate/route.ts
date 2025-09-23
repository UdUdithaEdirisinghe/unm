// src/app/api/store-credits/validate/route.ts
import { NextResponse } from "next/server";
import { getStoreCreditByCode, evaluateStoreCredit } from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReqBody = { code?: string; subtotal?: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const code = String(body.code || "").trim().toUpperCase();
    const subtotal = Number(body.subtotal ?? 0);

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const credit = await getStoreCreditByCode(code);
    if (!credit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = evaluateStoreCredit(credit, subtotal);

    return NextResponse.json({
      valid: result.valid,
      reason: result.reason,
      discount: result.discount,
      credit,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Validation failed" }, { status: 500 });
  }
}