import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL_FREIGHT || process.env.DATABASE_URL || "";
const databaseSsl = process.env.DATABASE_SSL;
const shouldUseSsl =
  databaseSsl === "true" ||
  databaseSsl === "require" ||
  databaseUrl.includes("sslmode=require") ||
  databaseUrl.includes(".neon.tech") ||
  process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false
});

export async function query(text, params = []) {
  return pool.query(text, params);
}
