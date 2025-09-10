import { NextResponse } from "next/server";
import { sql, toJson } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

type Row = {
  id: string; name: string; slug: string; image: string;
  price: number; sale_price: number | null; short_desc: string | null;
  brand: string | null; specs: any | null; stock: number; created_at: string;
};
const map = (r: Row) => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  image: r.image,
  price: Number(r.price),
  salePrice: r.sale_price ?? undefined,
  shortDesc: r.short_desc ?? "",
  brand: r.brand ?? "",
  specs: r.specs ?? {},
  stock: Number(r.stock),
  createdAt: r.created_at,
});

/* GET /api/products/:id */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = (await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
      from products where id = ${params.id} limit 1
    `) as Row[];
    if (rows.length === 0) return j({ error: "Not found" }, 404);
    return j(map(rows[0]));
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load product." }, 500);
  }
}

/* PUT /api/products/:id */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as any;

    const name = body.name != null ? String(body.name).trim() : null;
    const slug = body.slug != null ? String(body.slug).trim() : null;
    const imageRaw = body.image != null ? String(body.image).trim() : null;
    const image =
      imageRaw == null
        ? null
        : imageRaw.startsWith("/") || /^https?:\/\//i.test(imageRaw)
        ? imageRaw
        : `/${imageRaw}`;
    const price = body.price != null ? Number(body.price) : null;

    const spProvided = Object.prototype.hasOwnProperty.call(body, "salePrice");
    const spValue = spProvided
      ? body.salePrice === "" || body.salePrice == null
        ? null
        : Number(body.salePrice)
      : undefined;

    const shortDesc = body.shortDesc != null ? String(body.shortDesc) : null;
    const brand = body.brand != null ? String(body.brand) : null;
    const specs = body.specs === undefined ? undefined : body.specs;
    const stock = body.stock != null ? Number(body.stock) : null;

    if (slug) {
      const dup = (await sql`
        select exists (select 1 from products where slug = ${slug} and id <> ${params.id})
      `) as { exists: boolean }[];
      if (dup[0]?.exists) return j({ error: "Slug already exists." }, 409);
    }

    // Update (coalesce keeps old value when parameter is null)
    await sql`
      update products set
        name       = coalesce(${name}, name),
        slug       = coalesce(${slug}, slug),
        image      = coalesce(${image}, image),
        price      = coalesce(${price}, price),
        sale_price = ${spProvided ? sql`${spValue}` : sql`sale_price`},
        short_desc = coalesce(${shortDesc}, short_desc),
        brand      = coalesce(${brand}, brand),
        specs      = ${specs === undefined ? sql`specs` : sql`${toJson(specs)}::jsonb`},
        stock      = coalesce(${stock}, stock)
      where id = ${params.id}
    `;

    const row = (await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
      from products where id = ${params.id}
    `) as Row[];

    return j(map(row[0]));
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

/* DELETE /api/products/:id */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const r = (await sql`
      with del as (delete from products where id = ${params.id} returning 1)
      select count(*)::int as count from del
    `) as { count: number }[];
    if ((r[0]?.count ?? 0) === 0) return j({ error: "Not found" }, 404);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}