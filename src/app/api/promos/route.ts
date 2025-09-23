import { NextResponse } from "next/server";
import { getPromos, createPromo, type Promo } from "../../../lib/promos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) =>
  NextResponse.json(data, { status });

export async function GET() {
  try {
    const promos = await getPromos();
    return j(promos);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load promos." }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Promo>;

    const code = String(body.code || "").trim().toUpperCase();
    const type = String(body.type || "").trim() as Promo["type"];
    const enabled = Boolean(body.enabled);
    const value =
      type === "freeShipping" ? null :
      (body.value === undefined || body.value === null ? 0 : Number(body.value));

    if (!code || !type || !["percent","fixed","freeShipping"].includes(type)) {
      return j({ error: "Missing/invalid fields: code, type." }, 400);
    }

    const created = await createPromo({
      code,
      type,
      value,
      enabled,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
    } as Promo);

    return j(created, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create promo." }, 500);
  }
}