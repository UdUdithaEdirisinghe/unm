// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getProducts } from "../lib/products"; // uses our existing DB helpers

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use your real site domain (keep as-is if you're moving to this domain).
  const base = "https://manny.lk";

  // Core, always-present pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`,          priority: 1.0 },
    { url: `${base}/products`,  priority: 0.9 },
    { url: `${base}/cart`,      priority: 0.6 },
    { url: `${base}/checkout`,  priority: 0.6 },
    { url: `${base}/contact`,   priority: 0.5 },
    { url: `${base}/policies`,  priority: 0.3 },
    { url: `${base}/faq`,       priority: 0.3 },
  ];

  // Dynamic product pages (fails safe → empty list)
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts(); // must return { slug } at minimum
    productPages = products
      .filter(p => p?.slug)
      .map(p => ({
        url: `${base}/products/${p.slug}`,
        priority: 0.8,
      }));
  } catch {
    // swallow errors so sitemap still builds for static pages
    productPages = [];
  }

  return [...staticPages, ...productPages];
}