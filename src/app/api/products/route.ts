// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import {
  getProducts,
  createProduct,
  type Product,
} from "../../../lib/products";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

export async function GET() {
  try {
    const products = await getProducts();
    return j(products);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load products." }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Product>;
    const name = (body.name ?? "").toString().trim();
    const slug = (body.slug ?? "").toString().trim();
    const imageRaw = (body.image ?? "").toString().trim();
    const price = Number(body.price);
    const salePrice =
      body.salePrice === undefined || body.salePrice === null
        ? null
        : Number(body.salePrice);
    const stock = Number(body.stock ?? 0);

    if (!name || !slug || !imageRaw || !Number.isFinite(price)) {
      return j(
        { error: "Missing required fields: name, slug, image, or price." },
        400
      );
    }

    const image =
      imageRaw.startsWith("/") || /^https?:\/\//i.test(imageRaw)
        ? imageRaw
        : `/${imageRaw}`;

    const newP = await createProduct({
      id: "", // ignored in helper
      name,
      slug,
      image,
      price,
      salePrice,
      shortDesc: body.shortDesc ?? null,
      brand: body.brand ?? null,
      specs: (body.specs as any) ?? null,
      stock: Number.isFinite(stock) ? stock : 0,
    } as any);

    return j(newP, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create product." }, 500);
  }
}