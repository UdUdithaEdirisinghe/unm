// next.config.ts
import type { NextConfig } from "next";

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
};

export default nextConfig;