// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import {
  updateProduct,
  deleteProduct,
  type Product,
} from "../../../../lib/products";
import sql from "../../../../lib/db";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

// GET single (used by admin edit sometimes)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const rows = await sql`
    SELECT id, name, slug, image, price, sale_price, short_desc, brand, specs, stock, created_at
    FROM products WHERE id = ${params.id} LIMIT 1
  `;
  if (!rows[0]) return j({ error: "Not found" }, 404);
  const p = rows[0];
  return j({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.image,
    price: Number(p.price),
    salePrice: p.sale_price === null ? null : Number(p.sale_price),
    shortDesc: p.short_desc,
    brand: p.brand,
    specs: p.specs || null,
    stock: Number(p.stock ?? 0),
    createdAt: p.created_at,
  });
}

// PUT update
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as Partial<Product>;
    const next = await updateProduct(params.id, body);
    if (!next) return j({ error: "Not found" }, 404);
    return j(next);
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteProduct(params.id);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}