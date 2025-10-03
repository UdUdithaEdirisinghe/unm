// src/app/api/featured/route.ts
import { NextResponse } from "next/server";
import sql, { toJson } from "../../../lib/db"; // we call SQL directly for a type-flexible filter

export const dynamic = "force-dynamic";
export const revalidate = 0;

const j = (data: any, status = 200) => NextResponse.json(data, { status });

/**
 * This endpoint returns featured products, robust to different column types:
 * - BOOLEAN true
 * - INTEGER 1
 * - TEXT 'true', '1', 't', 'yes', 'y'
 *
 * Query params:
 *   ?exclude=<productId>   (optional)
 *   ?limit=8               (optional, default 8)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const excludeId = url.searchParams.get("exclude") || undefined;
    const limit = Number(url.searchParams.get("limit") || "8");

    // Flexible featured filter across boolean/int/text using ::text + normalization.
    const rows = await sql`
      SELECT
        id, name, slug, image, images, price, sale_price, short_desc,
        brand, category, specs, stock, created_at, warranty, featured
      FROM products
      WHERE
        COALESCE(NULLIF(btrim(lower(featured::text)), ''), 'false')
        IN ('1', 't', 'true', 'yes', 'y')
        ${excludeId ? sql`AND id <> ${excludeId}` : sql``}
      ORDER BY random()
      ${Number.isFinite(limit) && limit > 0 ? sql`LIMIT ${limit}` : sql``}
    `;

    // ——— mirror rowToProduct conversion inline to avoid an extra import
    function normalizeImages(input: unknown): string[] {
      if (!input) return [];
      if (Array.isArray(input)) {
        return input
          .map((s) => String(s || "").trim())
          .filter(Boolean)
          .map((s) => (s.startsWith("/") || /^https?:\/\//i.test(s) ? s : `/${s}`));
      }
      const s = String(input || "").trim();
      return s ? [(s.startsWith("/") || /^https?:\/\//i.test(s) ? s : `/${s}`)] : [];
    }
    const products = rows.map((r: any) => {
      const imgs = normalizeImages(r.images);
      const primary = imgs[0] || String(r.image || "") || "/placeholder.png";
      return {
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        image: primary,
        images: imgs.length ? imgs : primary ? [primary] : [],
        price: Number(r.price),
        salePrice: r.sale_price === null ? null : Number(r.sale_price),
        shortDesc: r.short_desc ?? null,
        brand: r.brand ?? null,
        category: r.category ?? null,
        specs: r.specs || null,
        stock: Number(r.stock ?? 0),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
        warranty: r.warranty ?? null,
        featured: ['1','t','true','yes','y'].includes(
          String(r.featured ?? '').toLowerCase().trim()
        ),
      };
    });

    return j(products);
  } catch (e: any) {
    return j({ error: e?.message || "Failed to load featured products." }, 500);
  }
}