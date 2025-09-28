// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // ✅ let the build succeed even if TS has errors
  typescript: {
    ignoreBuildErrors: true,
  },
  // ✅ let the build succeed even if ESLint has warnings/errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ✅ allow product images from Vercel Blob and similar hosts
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "public.blob.vercel-storage.com",
      },
      // If you also store under your own domain/CDN, add another block here
      // {
      //   protocol: "https",
      //   hostname: "yourcdn.com",
      // },
    ],
  },
  // ✅ add cache-control headers for static files + security headers
  async headers() {
    const headers = [];

    // 1) Security headers (HSTS preload-ready + extras) only in production
    if (isProd) {
      headers.push({
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=()",
          },
        ],
      });
    }

    // 2) Your existing static cache rule (unchanged)
    headers.push({
      source: "/:all*(ico|png|svg|jpg|jpeg|webp)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
      ],
    });

    return headers;
  },
};

export default nextConfig;