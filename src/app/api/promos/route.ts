import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/promos */
export async function GET() {
  try {
    const rows = (await sql`
      select code, type, value, enabled, starts_at, ends_at
      from promos order by code asc
    `) as any[];
    return j(rows);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load promos." }, 500);
  }
}

/* POST /api/promos */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const code = String(b.code ?? "").trim().toUpperCase();
    const type = String(b.type ?? "");
    const value = b.type === "freeShipping" ? null : Number(b.value ?? 0);
    const enabled = !!b.enabled;
    const starts = b.startsAt ? new Date(b.startsAt) : null;
    const ends = b.endsAt ? new Date(b.endsAt) : null;

    if (!code || !["percent", "fixed", "freeShipping"].includes(type)) {
      return j({ error: "Invalid promo." }, 400);
    }

    await sql`
      insert into promos (code, type, value, enabled, starts_at, ends_at)
      values (${code}, ${type}, ${value}, ${enabled}, ${starts}, ${ends})
      on conflict (code) do update set
        type = excluded.type,
        value = excluded.value,
        enabled = excluded.enabled,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at
    `;

    const rows = (await sql`select code, type, value, enabled, starts_at, ends_at from promos`) as any[];
    return j(rows, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to save promo." }, 500);
  }
}