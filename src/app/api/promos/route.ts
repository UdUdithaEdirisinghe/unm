// src/app/api/promos/route.ts
import { NextResponse } from "next/server";
import { listPromos, upsertPromo, type Promo } from "../../../lib/promos";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function GET() {
  try {
    const rows = await listPromos();
    return j(rows);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load promos." }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Promo;
    const saved = await upsertPromo(body);
    return j(saved, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to save promo." }, 500);
  }
}