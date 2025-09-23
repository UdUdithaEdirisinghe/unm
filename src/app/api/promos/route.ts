// List & create/update promos
import { NextResponse } from "next/server";
import { getPromos, upsertPromo, type Promo } from "../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/promos -> Promo[] */
export async function GET() {
  try {
    const rows = await getPromos();
    return j(rows);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load promos." }, 500);
  }
}

/** POST /api/promos -> create or overwrite */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Promo>;
    const code = String(body.code || "").trim().toUpperCase();
    const type = String(body.type || "").trim();
    const enabled = Boolean(body.enabled);
    const startsAt = body.startsAt ?? null;
    const endsAt = body.endsAt ?? null;

    if (!code || !type) {
      return j({ error: "Missing required fields: code, type." }, 400);
    }
    const value =
      type === "freeShipping" ? null : Number.isFinite(Number(body.value)) ? Number(body.value) : 0;

    const saved = await upsertPromo({
      code,
      type: type as Promo["type"],
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