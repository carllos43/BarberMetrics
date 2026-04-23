import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

/**
 * Server-side Supabase client used to verify user JWTs.
 * Uses the public anon key — `auth.getUser(token)` works because Supabase
 * validates the bearer token against its own auth service.
 */
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

/** Tiny in-memory cache to avoid hitting Supabase on every request. */
const cache = new Map<string, { exp: number; user: { id: string; email: string } }>();
const TTL_MS = 60_000;

export async function verifySupabaseToken(token: string): Promise<{ id: string; email: string } | null> {
  const cached = cache.get(token);
  const now = Date.now();
  if (cached && cached.exp > now) return cached.user;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user || !data.user.email) return null;

  const u = { id: data.user.id, email: data.user.email };
  cache.set(token, { user: u, exp: now + TTL_MS });
  // Keep the cache small.
  if (cache.size > 1000) cache.clear();
  return u;
}
