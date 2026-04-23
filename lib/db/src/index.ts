import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) must be set");
}

const isSupabase = /supabase\.(co|com)/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export const db = drizzle(pool, { schema });
export { pool };
export * from "./schema";
