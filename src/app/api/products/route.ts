// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/products */
export async function GET() {
  try {
    const rows = (await sql`
      SELECT
        id,
        slug,
        name,
        image,
        price,
        sale_price,
        short_desc,
        brand,
        specs,
        stock
      FROM products
      ORDER BY created_at DESC
    `) as any[];

    // map DB → API
    const data = rows.map((r) => ({
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
    }));

    return j(data);
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
    const imageRaw = String(body.image ?? "").trim();
    const price = Number(body.price);
    const salePrice =
      body.salePrice === "" || body.salePrice == null
        ? null
        : Number(body.salePrice);
    const stock = Number(body.stock ?? 0);
    const shortDesc = String(body.shortDesc ?? "");
    const brand = String(body.brand ?? "");
    const specs = body.specs ?? null; // JSON

    if (!name || !slug || !imageRaw || !Number.isFinite(price)) {
      return j({ error: "Missing name, slug, image or price." }, 400);
    }

    // normalize image path
    const image =
      imageRaw.startsWith("/") || /^https?:\/\//i.test(imageRaw)
        ? imageRaw
        : `/${imageRaw}`;

    // prevent slug duplicates
    const dup = (await sql`SELECT 1 FROM products WHERE slug = ${slug} LIMIT 1`) as any[];
    if (dup.length) return j({ error: "Slug already exists." }, 409);

    const inserted = (await sql`
      INSERT INTO products (slug, name, image, price, sale_price, short_desc, brand, specs, stock)
      VALUES (${slug}, ${name}, ${image}, ${price}, ${salePrice}, ${shortDesc}, ${brand}, ${specs}, ${stock})
      RETURNING id, slug, name, image, price, sale_price, short_desc, brand, specs, stock
    `) as any[];

    const p = inserted[0];
    return j(
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        image: p.image,
        price: Number(p.price),
        salePrice: p.sale_price ?? undefined,
        shortDesc: p.short_desc ?? "",
        brand: p.brand ?? "",
        specs: p.specs ?? undefined,
        stock: Number(p.stock ?? 0),
      },
      201
    );
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create product." }, 500);
  }
}