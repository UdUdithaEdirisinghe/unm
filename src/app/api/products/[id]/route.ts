// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { readProducts, writeProducts, type Product } from "../../../../lib/products";

const j = (d: any, s = 200) => NextResponse.json(d, { status: s });

/* ---------------- PUT /api/products/[id] ---------------- */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Read as 'any' so we can accept string/number/null for salePrice etc.
    const raw: any = await req.json();
    const products = await readProducts();
    const i = products.findIndex((p) => p.id === params.id);
    if (i < 0) return j({ error: "Not found" }, 404);

    const prev = products[i];

    // ----- validate unique slug if provided -----
    const newSlug =
      typeof raw.slug === "string" ? raw.slug.toString().trim() : undefined;
    if (newSlug) {
      const dup = products.some((p) => p.slug === newSlug && p.id !== params.id);
      if (dup) return j({ error: "Slug already exists." }, 409);
    }

    // ----- normalize image -----
    const nextImage = (() => {
      const val =
        typeof raw.image === "string" ? raw.image.trim() : prev.image ?? "";
      if (!val) return prev.image;
      return val.startsWith("/") || /^https?:\/\//i.test(val) ? val : `/${val}`;
    })();

    // ----- numbers -----
    const nextPrice =
      raw.price != null && Number.isFinite(Number(raw.price))
        ? Number(raw.price)
        : prev.price;

    const nextStock =
      raw.stock != null && Number.isFinite(Number(raw.stock))
        ? Number(raw.stock)
        : prev.stock;

    // ----- salePrice (allow clearing with "" or null) -----
    let nextSale: number | undefined = prev.salePrice;
    if ("salePrice" in raw) {
      const v = raw.salePrice; // any
      if (v === null || v === "") {
        nextSale = undefined; // clear discount
      } else if (Number.isFinite(Number(v))) {
        nextSale = Number(v);
      } // else keep previous if invalid
    }

    // ----- specs (accept object only) -----
    const nextSpecs =
      raw.specs && typeof raw.specs === "object" && !Array.isArray(raw.specs)
        ? (raw.specs as Product["specs"])
        : raw.specs === undefined
        ? prev.specs
        : prev.specs;

    const next: Product = {
      ...prev,
      name:
        typeof raw.name === "string" ? raw.name.toString().trim() : prev.name,
      slug: newSlug ?? prev.slug,
      image: nextImage,
      brand:
        typeof raw.brand === "string" ? raw.brand.toString().trim() : prev.brand,
      shortDesc:
        typeof raw.shortDesc === "string"
          ? raw.shortDesc.toString().trim()
          : prev.shortDesc,
      specs: nextSpecs,
      price: nextPrice,
      stock: nextStock,
      salePrice: nextSale,
    };

    products[i] = next;
    await writeProducts(products);
    return j(next);
  } catch (e: any) {
    return j({ error: e?.message || "Update failed." }, 500);
  }
}

/* ---------------- DELETE /api/products/[id] ---------------- */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const products = await readProducts();
    const before = products.length;
    const next = products.filter((p) => p.id !== params.id);
    if (next.length === before) return j({ error: "Not found" }, 404);
    await writeProducts(next);
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e?.message || "Delete failed." }, 500);
  }
}