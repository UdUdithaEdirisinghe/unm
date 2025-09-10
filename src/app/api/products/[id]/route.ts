// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* GET /api/products/:id */
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
    if (!rows.length) return j({ error: "Not found" }, 404);

    const r: any = rows[0];
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
    return j({ error: e?.message || "Failed to read product." }, 500);
  }
}

/* PUT /api/products/:id  — update product (supports clearing salePrice) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    // Load existing
    const found = await sql`
      select id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
      from products where id = ${params.id} limit 1
    `;
    if (!found.length) return j({ error: "Not found" }, 404);
    const prev: any = found[0];

    // Prepare next values (keep previous if not provided)
    const nextName = body.name != null ? String(body.name).trim() : prev.name;
    const nextSlug = body.slug != null ? String(body.slug).trim() : prev.slug;

    let nextImage =
      body.image != null ? String(body.image).trim() : String(prev.image || "");
    if (nextImage && !nextImage.startsWith("/") && !/^https?:\/\//i.test(nextImage)) {
      nextImage = `/${nextImage}`;
    }

    const nextPrice = body.price != null ? Number(body.price) : Number(prev.price);

    // salePrice: allow clearing with "" or null
    const nextSale =
      body.salePrice === "" || body.salePrice === null
        ? null
        : body.salePrice != null
        ? Number(body.salePrice)
        : prev.sale_price;

    const nextShort = body.shortDesc != null ? String(body.shortDesc) : prev.short_desc;
    const nextBrand = body.brand != null ? String(body.brand) : prev.brand;
    const nextSpecs = body.specs != null ? body.specs : prev.specs;
    const nextStock = body.stock != null ? Number(body.stock) : Number(prev.stock ?? 0);

    // unique slug?
    if (nextSlug !== prev.slug) {
      const dup = await sql`
        select 1 from products where slug = ${nextSlug} and id <> ${params.id} limit 1
      `;
      if (dup.length) return j({ error: "Slug already exists." }, 409);
    }

    const updated = await sql`
      update products
      set name = ${nextName},
          slug = ${nextSlug},
          image = ${nextImage},
          price = ${nextPrice},
          sale_price = ${nextSale},
          short_desc = ${nextShort},
          brand = ${nextBrand},
          specs = ${nextSpecs},
          stock = ${nextStock}
      where id = ${params.id}
      returning id, name, slug, image, price, sale_price, short_desc, brand, specs, stock
    `;

    const r: any = updated[0];
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

/* DELETE /api/products/:id */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await sql`delete from products where id = ${params.id} returning id`;
    if (!res.length) return j({ error: "Not found" }, 404);
    return j({ ok: true, id: res[0].id });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}
