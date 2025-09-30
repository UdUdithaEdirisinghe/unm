// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

/**
 * We type the SQL tag to always return `Promise<any[]>` so
 * code like `const rows = await sql`...`; rows[0]` works
 * without unions that break indexing in TS.
 */
type SqlTag = (<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
) => Promise<T[]>) & {
  // keep an escape hatch if you ever use `.unsafe`
  unsafe?: (text: string, params?: any[]) => Promise<any[]>;
};

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error("DATABASE_URL (or POSTGRES_URL / POSTGRES_PRISMA_URL) is not set");
}

// Neon returns a tag function; we just cast it to our friendlier type.
const sql = neon(url) as unknown as SqlTag;

export default sql;

/** Helper to serialize JSON for Postgres `::jsonb` columns */
export function toJson(v: unknown) {
  return JSON.stringify(v ?? null);
}
