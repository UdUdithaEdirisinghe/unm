import { NextResponse } from "next/server";
import { sql, toJson } from "../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

type Row = {
  id: string; name: string; slug: string; image: string;
  price: number; sale_price: number | null; short_desc: string | null;
  brand: string | null; specs: any | null; stock: number; created_at: string;
};

function mapRow(r: Row) {
  return {
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
  };
}

/* GET /api/products */
export async function GET() {
  try {
    const rows = (await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
      from products
      order by created_at desc
    `) as Row[];
    return j(rows.map(mapRow));
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load products." }, 500);
  }
}

/* POST /api/products */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;

    const id = `p_${Date.now()}`;
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const imageRaw = String(body.image ?? "").trim();
    const image =
      imageRaw.startsWith("/") || /^https?:\/\//i.test(imageRaw) ? imageRaw : `/${imageRaw}`;

    const price = Number(body.price);
    const salePrice =
      body.salePrice === "" || body.salePrice == null ? null : Number(body.salePrice);
    const shortDesc = String(body.shortDesc ?? "");
    const brand = String(body.brand ?? "");
    const specs = body.specs || {};
    const stock = Number.isFinite(Number(body.stock)) ? Number(body.stock) : 0;

    if (!name || !slug || !image || !Number.isFinite(price)) {
      return j({ error: "Missing required fields (name, slug, image, price)." }, 400);
    }

    const exists = (await sql`
      select exists (select 1 from products where slug = ${slug})
    `) as { exists: boolean }[];
    if (exists[0]?.exists) return j({ error: "Slug already exists." }, 409);

    await sql`
      insert into products (id, name, slug, image, price, sale_price, short_desc, brand, specs, stock)
      values (${id}, ${name}, ${slug}, ${image}, ${price}, ${salePrice},
              ${shortDesc}, ${brand}, ${toJson(specs)}::jsonb, ${stock})
    `;

    const row = (await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
      from products where id = ${id}
    `) as Row[];

    return j(mapRow(row[0]), 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create product." }, 500);
  }
}