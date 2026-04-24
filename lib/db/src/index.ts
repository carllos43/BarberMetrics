import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) must be set");
}

const url = new URL(connectionString);
const isSupabase = /supabase\.(co|com)/.test(url.hostname);

// Pooler do Supabase escuta na porta 6543 (PgBouncer transaction mode).
// Mantemos `keepAlive` ligado pra reaproveitar TCP entre requests e evitar
// o handshake de ~100ms a cada chamada. `idleTimeoutMillis` baixo pra liberar
// conexões em ambiente serverless.
const pool = new Pool({
  host: url.hostname,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, "") || "postgres",
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  max: 10,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export { pool };
export * from "./schema";
