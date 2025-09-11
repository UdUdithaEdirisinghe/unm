// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

/**
 * Neon SQL client (tagged template).
 * Usage: await sql`SELECT * FROM products WHERE id = ${id}`;
 */
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error("DATABASE_URL (or POSTGRES_URL) is not set");
}

const sql = neon(url);
export default sql;

// tiny helper when you need to pass JSON to Postgres
export function toJson(v: unknown) {
  return JSON.stringify(v ?? null);
}