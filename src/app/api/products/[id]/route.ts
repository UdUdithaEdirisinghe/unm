// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/** GET /api/products/:id */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
      from products
      where id = ${params.id}
      limit 1
    `;
    if (rows.length === 0) return j({ error: "Not found" }, 404);
    const r = rows[0];
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
    return j({ error: e?.message || "Failed to load product." }, 500);
  }
}

/** PUT /api/products/:id */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const name = body.name != null ? String(body.name).trim() : undefined;
    const slug = body.slug != null ? String(body.slug).trim() : undefined;
    const image =
      body.image != null
        ? (() => {
            const raw = String(body.image).trim();
            if (!raw) return undefined;
            return raw.startsWith("/") || /^https?:\/\//i.test(raw)
              ? raw
              : `/${raw}`;
          })()
        : undefined;
    const price = body.price != null ? Number(body.price) : undefined;
    const salePrice =
      body.salePrice === "" ? null : body.salePrice != null ? Number(body.salePrice) : undefined;
    const stock = body.stock != null ? Number(body.stock) : undefined;
    const shortDesc = body.shortDesc != null ? String(body.shortDesc) : undefined;
    const brand = body.brand != null ? String(body.brand) : undefined;
    const specs = body.specs !== undefined ? body.specs : undefined;

    if (slug) {
      const dup = await sql`
        select 1 from products where slug = ${slug} and id <> ${params.id} limit 1
      `;
      if (dup.length) return j({ error: "Slug already exists." }, 409);
    }

    const updated = await sql`
      update products set
        name = coalesce(${name}, name),
        slug = coalesce(${slug}, slug),
        image = coalesce(${image}, image),
        price = coalesce(${price}, price),
        sale_price = ${salePrice} is not null ? ${salePrice} : sale_price,
        short_desc = coalesce(${shortDesc}, short_desc),
        brand = coalesce(${brand}, brand),
        specs = coalesce(${specs}, specs),
        stock = coalesce(${stock}, stock)
      where id = ${params.id}
      returning id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
    `;

    if (updated.length === 0) return j({ error: "Not found" }, 404);
    const r = updated[0];
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

/** DELETE /api/products/:id */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const del = await sql`delete from products where id = ${params.id} returning id`;
    if (del.length === 0) return j({ error: "Not found" }, 404);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}
