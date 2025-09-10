// src/app/api/promos/route.ts
import { NextResponse } from "next/server";
import { readPromos, writePromos, type Promo } from "../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function GET() {
  const list = await readPromos();
  return j(list);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Promo>;
  const code = (body.code ?? "").toString().trim().toUpperCase();
  const type = body.type;
  const value = body.value;

  if (!code || !type || !["percent", "fixed", "freeShipping"].includes(type)) {
    return j({ error: "Invalid promo payload." }, 400);
  }
  if ((type === "percent" || type === "fixed") && !Number.isFinite(Number(value))) {
    return j({ error: "Value required for this promo type." }, 400);
  }

  const list = await readPromos();
  if (list.some(p => p.code === code)) {
    return j({ error: "Code already exists." }, 409);
  }

  const toSave: Promo = {
    code,
    type: type as Promo["type"],
    value: type === "freeShipping" ? undefined : Number(value),
    enabled: body.enabled ?? true,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
  };

  list.push(toSave);
  await writePromos(list);
  return j(toSave, 201);
}