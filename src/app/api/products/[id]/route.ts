// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db"; // <-- uses your Neon helper

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* -------------------- GET /api/products/:id -------------------- */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await sql/*sql*/`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
      from products
      where id = ${params.id}
      limit 1
    `;
    if (rows.length === 0) return j({ error: "Not found" }, 404);

    const r = rows[0] as any;
    return j({
      id: r.id,
      name: r.name,
      slug: r.slug,
      image: r.image,
      price: Number(r.price),
      salePrice: r.sale_price ?? undefined,
      shortDesc: r.short_desc ?? "",
      brand: r.brand ?? "",
      specs: r.specs ?? undefined, // JSONB
      stock: Number(r.stock ?? 0),
    });
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load product." }, 500);
  }
}

/* -------------------- PUT /api/products/:id -------------------- */
/* Updates only provided fields; others remain unchanged.
   To CLEAR the sale price, send { "salePrice": "" } or null. */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const name = (body.name ?? "").toString().trim();
    const slug = (body.slug ?? "").toString().trim();

    // normalize image if provided
    const imageRaw = (body.image ?? "").toString().trim();
    const image =
      imageRaw && (imageRaw.startsWith("/") || /^https?:\/\//i.test(imageRaw))
        ? imageRaw
        : imageRaw
        ? `/${imageRaw}`
        : "";

    const price = body.price != null ? Number(body.price) : undefined;
    const stock = body.stock != null ? Number(body.stock) : undefined;

    // sale price: support “clear to NULL”
    const saleProvided = body.salePrice !== undefined;
    const clearSale = body.salePrice === "" || body.salePrice === null;
    const salePrice =
      saleProvided && !clearSale ? Number(body.salePrice) : undefined;

    // slug uniqueness (excluding this product)
    if (slug) {
      const dup = await sql/*sql*/`
        select 1 from products where slug = ${slug} and id <> ${params.id} limit 1
      `;
      if (dup.length) return j({ error: "Slug already exists." }, 409);
    }

    // Build nullable values for COALESCE (undefined → NULL means “don’t change”)
    const nameV = name || null;
    const slugV = slug || null;
    const imageV = image || null;
    const priceV = Number.isFinite(price as number) ? price : null;
    const shortV =
      body.shortDesc !== undefined ? String(body.shortDesc ?? "") : null;
    const brandV = body.brand !== undefined ? String(body.brand ?? "") : null;
    const specsV = body.specs !== undefined ? body.specs : null; // JSONB
    const stockV = Number.isFinite(stock as number) ? stock : null;

    await sql/*sql*/`
      update products
      set
        name       = COALESCE(${nameV}, name),
        slug       = COALESCE(${slugV}, slug),
        image      = COALESCE(${imageV}, image),
        price      = COALESCE(${priceV}::int, price),
        -- sale_price: if caller explicitly asked to clear, set NULL; else apply COALESCE
        sale_price = CASE
                       WHEN ${saleProvided} AND ${clearSale} THEN NULL
                       ELSE COALESCE(${salePrice ?? null}::int, sale_price)
                     END,
        short_desc = COALESCE(${shortV}, short_desc),
        brand      = COALESCE(${brandV}, brand),
        specs      = COALESCE(${specsV}::jsonb, specs),
        stock      = COALESCE(${stockV}::int, stock),
        updated_at = now()
      where id = ${params.id}
    `;

    // return the updated row
    const out = await sql/*sql*/`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
      from products
      where id = ${params.id}
      limit 1
    `;
    if (out.length === 0) return j({ error: "Not found" }, 404);

    const r = out[0] as any;
    return j({
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
    });
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

/* -------------------- DELETE /api/products/:id -------------------- */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await sql/*sql*/`
      delete from products where id = ${params.id} returning id
    `;
    if (res.length === 0) return j({ error: "Not found" }, 404);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}