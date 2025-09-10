// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error("DATABASE_URL (or POSTGRES_URL/POSTGRES_PRISMA_URL) is not set");
}

// Tagged-template SQL client
export const sql = neon(url);

// Helper when sending JSON to the DB
export const toJson = (v: unknown) => JSON.stringify(v);