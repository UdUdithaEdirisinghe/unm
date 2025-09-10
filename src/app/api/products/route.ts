import { NextResponse } from "next/server";
import { readProducts, writeProducts, type Product } from "../../../lib/products";

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/* GET /api/products */
export async function GET() {
  try {
    const products = await readProducts();
    return j(products);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load products." }, 500);
  }
}

/* POST /api/products */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Product>;

    const name = (body.name ?? "").toString().trim();
    const slug = (body.slug ?? "").toString().trim();
    const image = (body.image ?? "").toString().trim();
    const price = Number(body.price);
    const salePrice = body.salePrice != null ? Number(body.salePrice) : undefined;
    const stock = Number(body.stock ?? 0);

    if (!name || !slug || !image || !Number.isFinite(price)) {
      return j({ error: "Missing required fields: name, slug, image, or price." }, 400);
    }

    const products = await readProducts();
    if (products.some(p => p.slug === slug)) {
      return j({ error: "Slug already exists." }, 409);
    }

    const newProduct: Product = {
      id: `p_${Date.now()}`,
      name,
      slug,
      image: image.startsWith("/") || /^https?:\/\//i.test(image) ? image : `/${image}`,
      price,
      salePrice,
      shortDesc: body.shortDesc ?? "",
      brand: body.brand ?? "",
      specs: body.specs,
      stock: Number.isFinite(stock) ? stock : 0,
    };

    products.push(newProduct);
    await writeProducts(products);
    return j(newProduct, 201);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to create product." }, 500);
  }
}