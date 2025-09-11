// src/app/api/products/[id]/status/route.ts
import { NextResponse } from "next/server";
import sql from "../../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

function mapRow(r: any) {
  return {
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    image: String(r.image),
    price: Number(r.price),
    salePrice: r.sale_price === null ? null : Number(r.sale_price),
    shortDesc: r.short_desc ?? null,
    brand: r.brand ?? null,
    specs: r.specs || null,
    stock: Number(r.stock ?? 0),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
  };
}

/**
 * PATCH body: { stock: number }
 * - stock must be >= 0 (integer)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = body?.stock;

    const stock = Number.isFinite(Number(raw)) ? Math.max(0, Math.floor(Number(raw))) : NaN;
    if (!Number.isFinite(stock)) {
      return j({ error: "Invalid stock value." }, 400);
    }

    const rows = await sql`
      UPDATE products
      SET stock = ${stock}
      WHERE id = ${params.id}
      RETURNING id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
    `;
    if (!rows[0]) return j({ error: "Product not found." }, 404);

    return j(mapRow(rows[0]));
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update product status." }, 500);
  }
}