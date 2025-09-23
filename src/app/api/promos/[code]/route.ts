import { NextResponse } from "next/server";
import { deletePromo, getPromo, upsertPromo, type Promo } from "../../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/** PUT /api/promos/:code  (update) */
export async function PUT(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = String(params.code || "").toUpperCase();
    if (!code) return j({ error: "Code required." }, 400);

    const existing = await getPromo(code);
    if (!existing) return j({ error: "Not found." }, 404);

    const body = (await req.json()) as Partial<Promo>;
    const type = (body.type ?? existing.type) as Promo["type"];
    const enabled = body.enabled ?? existing.enabled;
    const startsAt = body.startsAt ?? existing.startsAt ?? null;
    const endsAt = body.endsAt ?? existing.endsAt ?? null;

    const value =
      type === "freeShipping"
        ? null
        : body.value !== undefined
        ? Number(body.value)
        : existing.value ?? 0;

    const saved = await upsertPromo({
      code,
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
export async function DELETE(
  _req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = String(params.code || "").toUpperCase();
    if (!code) return j({ error: "Code required." }, 400);
    await deletePromo(code);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete promo." }, 500);
  }
}