// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getProducts } from "../lib/products"; // uses our existing DB helpers

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use your real site domain (unchanged)
  const base = "https://manny.lk";

  // Core, always-present pages (unchanged)
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`,          priority: 1.0 },
    { url: `${base}/products`,  priority: 0.9 },
    { url: `${base}/cart`,      priority: 0.6 },
    { url: `${base}/checkout`,  priority: 0.6 },
    { url: `${base}/contact`,   priority: 0.5 },
    { url: `${base}/policies`,  priority: 0.3 },
    { url: `${base}/faq`,       priority: 0.3 },
  ];

  // Helper to safely turn a value into a Date (or undefined)
  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined;
    const d = new Date(String(v));
    return isNaN(d.valueOf()) ? undefined : d;
  };

  // Dynamic product pages (fail-safe → empty list)
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts(); // must return { slug } at minimum
    productPages = products
      .filter((p) => p?.slug)
      .map((p) => {
        const lastModified =
          toDate((p as any).updatedAt) ||
          toDate((p as any).createdAt);
        return {
          url: `${base}/products/${p.slug}`,
          priority: 0.8,
          ...(lastModified ? { lastModified } : {}),
        };
      });
  } catch {
    productPages = [];
  }

  return [...staticPages, ...productPages];
}