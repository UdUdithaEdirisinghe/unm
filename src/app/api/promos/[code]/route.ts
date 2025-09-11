// src/app/api/promos/[code]/route.ts
import { NextResponse } from "next/server";
import { upsertPromo, deletePromo, getPromoByCode, type Promo } from "../../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const p = await getPromoByCode(params.code);
  if (!p) return j({ error: "Not found" }, 404);
  return j(p);
}

export async function PUT(req: Request, { params }: { params: { code: string } }) {
  try {
    const body = (await req.json()) as Promo;
    const saved = await upsertPromo({ ...body, code: params.code.toUpperCase() });
    return j(saved);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update promo." }, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  try {
    const ok = await deletePromo(params.code);
    if (!ok) return j({ error: "Not found" }, 404);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete promo." }, 500);
  }
}