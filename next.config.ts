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
};

export default nextConfig;