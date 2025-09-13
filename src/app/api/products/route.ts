import { NextResponse } from "next/server";
import { getProducts, createProduct, type Product } from "../../../lib/products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/* GET /api/products */
export async function GET() {
  try {
    const products = await getProducts();
    return j(products);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load products." }, 500);
  }
}

/* POST /api/products */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Product> & { images?: string[] };

    const name = (body.name ?? "").toString().trim();
    const slug = (body.slug ?? "").toString().trim();
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    // images: prefer array; fallback to single image
    const images = Array.isArray(body.images)
      ? body.images
      : (body.image ? [body.image] : []);

    if (!name || !slug || !Number.isFinite(price) || images.length === 0) {
      return j(
        { error: "Missing required fields: name, slug, price, images." },
        400
      );
    }

    const created = await createProduct({
      name,
      slug,
      images,
      price,
      salePrice:
        body.salePrice === null || body.salePrice === undefined
          ? null
          : Number(body.salePrice),
      shortDesc: body.shortDesc ?? null,
      brand: body.brand ?? null,
      category: body.category ?? null,
      specs: (body.specs as Record<string, string> | null) ?? null,
      stock: Number.isFinite(stock) ? stock : 0,
    });

    return j(created, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create product." }, 500);
  }
}