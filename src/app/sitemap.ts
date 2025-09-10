// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { PRODUCTS } from "../lib/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://manny.lk";

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`,        priority: 1.0 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/cart`,     priority: 0.6 },
    { url: `${base}/checkout`, priority: 0.6 },
    { url: `${base}/contact`,  priority: 0.5 },
  ];

  const productPages: MetadataRoute.Sitemap = PRODUCTS.map(p => ({
    url: `${base}/products/${p.slug}`,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}
