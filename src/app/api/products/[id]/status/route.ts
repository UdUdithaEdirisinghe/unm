// src/app/api/products/[id]/status/route.ts
import { NextResponse } from "next/server";
import { updateProduct, type Product } from "../../../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/**
 * PATCH /api/products/:id/status
 * Accepts a minimal patch for quick admin actions:
 * { stock?: number, price?: number, salePrice?: number | null }
 * (You can add brand/shortDesc/specs later if you want.)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<
      Pick<Product, "stock" | "price" | "salePrice">
    >;

    const patch: Partial<Product> = {};

    if (body.stock != null) patch.stock = Number(body.stock);
    if (body.price != null) patch.price = Number(body.price);

    // salePrice: allow number or null (clear discount when null)
    if (Object.prototype.hasOwnProperty.call(body, "salePrice")) {
      patch.salePrice =
        body.salePrice === null ? null : Number(body.salePrice);
    }

    if (
      patch.stock === undefined &&
      patch.price === undefined &&
      patch.salePrice === undefined
    ) {
      return j({ error: "Nothing to update." }, 400);
    }

    const updated = await updateProduct(params.id, patch);
    if (!updated) return j({ error: "Product not found." }, 404);

    return j(updated, 200);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to update product." }, 500);
  }
}