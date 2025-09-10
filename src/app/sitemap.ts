// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { readProducts } from "../lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://manny.lk";

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1.0 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/cart`, priority: 0.6 },
    { url: `${base}/checkout`, priority: 0.6 },
    { url: `${base}/contact`, priority: 0.5 },
  ];

  // ✅ Load products from JSON file dynamically
  const products = await readProducts();

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}