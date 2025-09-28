// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Disallow sensitive/non-indexable routes
      {
        userAgent: "*",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/cart",
          "/checkout",
          "/private",
          "/preview",
        ],
        allow: ["/"],
      },
      // (Optional) examples if you ever want to fine-tune AI bots:
      // { userAgent: "CCBot", disallow: ["/admin", "/cart", "/checkout", "/api/*"] },
      // { userAgent: "GPTBot", allow: ["/"], disallow: ["/admin","/cart","/checkout","/api/*"] },
      // { userAgent: "Google-Extended", allow: ["/"], disallow: ["/admin","/cart","/checkout","/api/*"] },
    ],
    sitemap: "https://manny.lk/sitemap.xml",
    host: "https://manny.lk",
  };
}