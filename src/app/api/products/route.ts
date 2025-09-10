// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/* GET /api/products */
export async function GET() {
  try {
    const rows = await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
      from products
      order by created_at desc
    `;

    const products = rows.map((r: any) => ({
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      image: r.image as string,
      price: Number(r.price),
      salePrice: r.sale_price ?? undefined,
      shortDesc: r.short_desc ?? "",
      brand: r.brand ?? "",
      specs: r.specs ?? undefined,       // JSONB
      stock: Number(r.stock ?? 0),
    }));

    return j(products);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load products." }, 500);
  }
}

/* POST /api/products */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    let image = String(body.image ?? "").trim();
    const price = Number(body.price);
    const salePrice =
      body.salePrice === "" || body.salePrice == null
        ? null
        : Number(body.salePrice);
    const stock = Number(body.stock ?? 0);
    const shortDesc = String(body.shortDesc ?? "");
    const brand = String(body.brand ?? "");
    const specs = body.specs ?? null;

    if (!name || !slug || !image || !Number.isFinite(price)) {
      return j({ error: "Missing name, slug, image or price." }, 400);
    }
    if (!image.startsWith("/") && !/^https?:\/\//i.test(image)) {
      image = `/${image}`;
    }

    // unique slug?
    const dup = await sql`select 1 from products where slug = ${slug} limit 1`;
    if (dup.length) return j({ error: "Slug already exists." }, 409);

    const id = `p_${Date.now()}`;

    const inserted = await sql`
      insert into products
        (id, name, slug, image, price, sale_price, short_desc, brand, specs, stock)
      values
        (${id}, ${name}, ${slug}, ${image}, ${price}, ${salePrice}, ${shortDesc}, ${brand}, ${specs}, ${stock})
      returning id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
    `;

    const r = inserted[0];
    return j(
      {
        id: r.id,
        name: r.name,
        slug: r.slug,
        image: r.image,
        price: Number(r.price),
        salePrice: r.sale_price ?? undefined,
        shortDesc: r.short_desc ?? "",
        brand: r.brand ?? "",
        specs: r.specs ?? undefined,
        stock: Number(r.stock ?? 0),
      },
      201
    );
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create product." }, 500);
  }
}

