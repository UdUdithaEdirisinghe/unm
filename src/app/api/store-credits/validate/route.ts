import { NextResponse } from "next/server";
import { getStoreCredit, validateStoreCreditForOrder } from "../../../../lib/storeCredits";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/** GET /api/store-credits/validate?code=CREDIT1000&orderTotal=4890 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = String(searchParams.get("code") || "").toUpperCase().trim();
    const orderTotal = Number(searchParams.get("orderTotal") || 0);

    if (!code) return j({ valid: false, reason: "NO_CODE" }, 400);
    if (!Number.isFinite(orderTotal) || orderTotal < 0)
      return j({ valid: false, reason: "BAD_TOTAL" }, 400);

    const credit = await getStoreCredit(code);
    const result = validateStoreCreditForOrder(credit, orderTotal);

    return j({ ...result, credit });
  } catch (e: any) {
    return j({ error: e?.message || "Validation failed." }, 500);
  }
}