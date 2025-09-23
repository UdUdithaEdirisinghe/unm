// Read/Update/Delete a single promo by code
import { NextResponse } from "next/server";
import { getPromoByCode, upsertPromo, deletePromo, type Promo } from "../../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/promos/:code */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const row = await getPromoByCode(params.code);
    if (!row) return j({ error: "Not found" }, 404);
    return j(row);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to read promo." }, 500);
  }
}

/** PUT /api/promos/:code */
export async function PUT(req: Request, { params }: { params: { code: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Promo>;
    const base = await getPromoByCode(params.code);
    if (!base) return j({ error: "Not found" }, 404);

    const type = (body.type ?? base.type) as Promo["type"];
    const enabled = body.enabled ?? base.enabled;
    const startsAt = body.startsAt ?? base.startsAt ?? null;
    const endsAt = body.endsAt ?? base.endsAt ?? null;
    const value =
      type === "freeShipping"
        ? null
        : body.value != null
        ? Number(body.value)
        : base.value ?? 0;

    const saved = await upsertPromo({
      code: base.code,
      type,
      value,
      enabled,
      startsAt,
      endsAt,
    });
    return j(saved);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update promo." }, 500);
  }
}

/** DELETE /api/promos/:code */
export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  try {
    await deletePromo(params.code);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete promo." }, 500);
  }
}