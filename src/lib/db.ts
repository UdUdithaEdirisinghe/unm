// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

// Works with any of these env names (Vercel/Neon use different defaults)
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error("DATABASE_URL (or POSTGRES_URL) is not set");
}

// Shared SQL client (tagged-template style only)
export const sql = neon(url);
