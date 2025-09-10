// src/lib/db.ts
import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error("DATABASE_URL (or POSTGRES_URL) is not set");
}

// Single shared client
export const sql = neon(url);
// optional helper type if you want it elsewhere:
export type Sql = ReturnType<typeof neon>;