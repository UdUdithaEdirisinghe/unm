// src/app/api/promos/[code]/route.ts
import { NextResponse } from "next/server";
import { readPromos, writePromos, type Promo } from "../../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function PUT(req: Request, { params }: { params: { code: string } }) {
  const body = (await req.json()) as Partial<Promo>;
  const code = params.code.toUpperCase();

  const list = await readPromos();
  const idx = list.findIndex(p => p.code === code);
  if (idx < 0) return j({ error: "Not found." }, 404);

  const curr = list[idx];
  const next: Promo = {
    ...curr,
    type: (body.type ?? curr.type) as Promo["type"],
    value: body.type === "freeShipping"
      ? undefined
      : (body.value != null ? Number(body.value) : curr.value),
    enabled: body.enabled ?? curr.enabled,
    startsAt: body.startsAt ?? curr.startsAt,
    endsAt: body.endsAt ?? curr.endsAt,
  };

  // validate
  if (next.type !== "freeShipping" && !Number.isFinite(Number(next.value))) {
    return j({ error: "Value required for this type." }, 400);
  }

  list[idx] = next;
  await writePromos(list);
  return j(next);
}

export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const list = await readPromos();
  const idx = list.findIndex(p => p.code === code);
  if (idx < 0) return j({ error: "Not found." }, 404);

  list.splice(idx, 1);
  await writePromos(list);
  return j({ ok: true });
}