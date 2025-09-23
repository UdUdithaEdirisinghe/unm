import { NextResponse } from "next/server";
import { getPromos, upsertPromo, type Promo } from "../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/** GET /api/promos */
export async function GET() {
  try {
    const promos = await getPromos();
    return j(promos);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load promos." }, 500);
  }
}

/** POST /api/promos  (create) */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Promo>;

    const code = String(body.code || "").toUpperCase().trim();
    const type = String(body.type || "").trim();
    const enabled = Boolean(body.enabled);
    const startsAt = body.startsAt ?? null;
    const endsAt = body.endsAt ?? null;

    if (!code || !["percent", "fixed", "freeShipping"].includes(type)) {
      return j({ error: "Invalid code or type." }, 400);
    }

    const value =
      type === "freeShipping"
        ? null
        : Number.isFinite(Number(body.value))
        ? Number(body.value)
        : 0;

    const saved = await upsertPromo({
      code,
      type: type as any,
      value,
      enabled,
      startsAt,
      endsAt,
    });

    return j(saved, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to save promo." }, 500);
  }
}