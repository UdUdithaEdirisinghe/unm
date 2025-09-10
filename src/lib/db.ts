import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL not set in environment variables");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // needed for Neon
});

// simple test function
export async function testDB() {
  const result = await pool.query("SELECT NOW()");
  return result.rows[0];
}