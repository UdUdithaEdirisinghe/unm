import { NextResponse } from "next/server";
import { getPromoByCode, updatePromo, deletePromo, type Promo } from "../../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) =>
  NextResponse.json(data, { status });

type Ctx = { params: { code: string } };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const code = (ctx.params.code || "").toUpperCase();
    const body = (await req.json()) as Partial<Promo>;

    const exists = await getPromoByCode(code);
    if (!exists) return j({ error: "Promo not found." }, 404);

    const updated = await updatePromo(code, body);
    if (!updated) return j({ error: "Update failed." }, 500);
    return j(updated);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update promo." }, 500);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const code = (ctx.params.code || "").toUpperCase();
    const ok = await deletePromo(code);
    if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete promo." }, { status: 500 });
  }
}