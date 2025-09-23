import { NextResponse } from "next/server";
import { getPromoByCode, evaluatePromo } from "../../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) =>
  NextResponse.json(data, { status });

type ReqBody = {
  code?: string;
  subtotal?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;
    const code = String(body.code || "").trim().toUpperCase();
    const subtotal = Number(body.subtotal ?? 0);

    if (!code) {
      return j({ error: "Missing code." }, 400);
    }

    const promo = await getPromoByCode(code);
    if (!promo) {
      // Not found is a common case—return 404 so UI can show “invalid code”
      return j({ error: "Promo not found." }, 404);
    }

    const result = evaluatePromo(promo, subtotal);

    return j({
      valid: result.valid,
      reason: result.reason,
      discount: result.discount,
      freeShipping: result.freeShipping,
      promo: {
        code: promo.code,
        type: promo.type,
        value: promo.value ?? null,
        startsAt: promo.startsAt ?? null,
        endsAt: promo.endsAt ?? null,
        enabled: promo.enabled,
      },
    });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to validate promo." }, 500);
  }
}