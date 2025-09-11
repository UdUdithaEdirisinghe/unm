// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { updateProduct, deleteProduct, type Product } from "../../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* PUT /api/products/[id] — update */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await req.json()) as Partial<Product>;

    // Normalize fields similarly to lib behavior
    if (typeof patch.name === "string") patch.name = patch.name.trim();
    if (typeof patch.slug === "string") patch.slug = patch.slug.trim();
    if (typeof patch.image === "string") {
      const raw = patch.image.trim();
      patch.image =
        raw.startsWith("/") || /^https?:\/\//i.test(raw) ? raw : `/${raw}`;
    }
    if (patch.price != null) patch.price = Number(patch.price);
    if (patch.salePrice === undefined) {
      // keep as-is in lib; do nothing
    } else {
      patch.salePrice =
        patch.salePrice === null ? null : Number(patch.salePrice);
    }
    if (patch.stock != null) patch.stock = Number(patch.stock);

    const updated = await updateProduct(params.id, patch);
    if (!updated) return j({ error: "Not found" }, 404);
    return j(updated);
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

/* DELETE /api/products/[id] — delete */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await deleteProduct(params.id);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}