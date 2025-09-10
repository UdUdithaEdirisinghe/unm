import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* PUT /api/promos/:code */
export async function PUT(req: Request, { params }: { params: { code: string } }) {
  try {
    const b = await req.json();
    const code = params.code.toUpperCase();
    const type = String(b.type ?? "");
    const value = b.type === "freeShipping" ? null : Number(b.value ?? 0);
    const enabled = !!b.enabled;
    const starts = b.startsAt ? new Date(b.startsAt) : null;
    const ends = b.endsAt ? new Date(b.endsAt) : null;

    if (!["percent", "fixed", "freeShipping"].includes(type)) {
      return j({ error: "Invalid type." }, 400);
    }

    const res = (await sql`
      update promos set
        type = ${type}, value = ${value}, enabled = ${enabled},
        starts_at = ${starts}, ends_at = ${ends}
      where code = ${code}
      returning code, type, value, enabled, starts_at, ends_at
    `) as any[];

    if (res.length === 0) return j({ error: "Not found" }, 404);
    return j(res[0]);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update promo." }, 500);
  }
}

/* DELETE /api/promos/:code */
export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  try {
    const r = (await sql`
      with del as (delete from promos where code = ${params.code.toUpperCase()} returning 1)
      select count(*)::int as count from del
    `) as { count: number }[];
    if ((r[0]?.count ?? 0) === 0) return j({ error: "Not found" }, 404);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to delete promo." }, 500);
  }
}