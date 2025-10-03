import { NextResponse } from "next/server";
import {
  updateProduct,
  deleteProduct,
  type Product,
} from "../../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* PUT /api/products/[id] — update */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as Partial<Product> & { images?: string[] };

    // Normalize strings
    if (typeof patch.name === "string") patch.name = patch.name.trim();
    if (typeof patch.slug === "string") patch.slug = patch.slug.trim();

    // Normalize numeric
    if (patch.price != null) patch.price = Number(patch.price);
    if (patch.salePrice !== undefined) {
      patch.salePrice = patch.salePrice === null ? null : Number(patch.salePrice);
    }
    if (patch.stock != null) patch.stock = Number(patch.stock);

    // Normalize images array if present
    if (patch.images && !Array.isArray(patch.images)) {
      patch.images = [String(patch.images)];
    }

    // Normalize warranty (string or null)
    if (patch.warranty !== undefined && patch.warranty !== null) {
      patch.warranty = String(patch.warranty);
    }

    // NEW: normalize featured if present
    if (patch.featured !== undefined) {
      patch.featured = Boolean(patch.featured);
    }

    const updated = await updateProduct(params.id, patch);
    if (!updated) return j({ error: "Not found" }, 404);
    return j(updated);
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

/* DELETE /api/products/[id] */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteProduct(params.id);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}