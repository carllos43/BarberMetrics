import { supabase } from "./supabase";

const PROFILE_KEY = "barbermetrics.profile";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  commissionPercent: number;
}
export interface Barbershop {
  id: string;
  name: string;
  slug: string;
}
export interface AuthSession {
  token: string;
  user: AuthUser;
  barbershop: Barbershop;
}

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");

const listeners = new Set<(s: AuthSession | null) => void>();

let cachedToken: string | null = null;
let cachedProfile: { user: AuthUser; barbershop: Barbershop } | null = null;

try {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) cachedProfile = JSON.parse(raw);
} catch { /* ignore */ }

async function readToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  cachedToken = data.session?.access_token ?? null;
  return cachedToken;
}

/** Synchronous getter used by the request signer in api-client-react. */
export function getToken(): string | null {
  return cachedToken;
}

export function getSession(): AuthSession | null {
  if (!cachedToken || !cachedProfile) return null;
  return { token: cachedToken, user: cachedProfile.user, barbershop: cachedProfile.barbershop };
}

function persistProfile(p: { user: AuthUser; barbershop: Barbershop } | null) {
  cachedProfile = p;
  try {
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else   localStorage.removeItem(PROFILE_KEY);
  } catch { /* ignore quota errors */ }
}

function emit() {
  const s = getSession();
  listeners.forEach((l) => l(s));
}

export function onAuthChange(fn: (s: AuthSession | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Keep token cache + listeners in sync with Supabase session changes.
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
  if (!cachedToken) persistProfile(null);
  emit();
});

async function callApi<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const t = token ?? (await readToken());
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(t ? { authorization: `Bearer ${t}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.error ?? body?.message ?? `Erro ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export async function signup(input: {
  email: string; password: string; fullName: string; barbershopName?: string;
}): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session) {
    // Email confirmation is enabled in this Supabase project.
    throw new Error("Conta criada — confirme o e-mail antes de entrar.");
  }
  const token = data.session.access_token;
  cachedToken = token;
  const profile = await callApi<{ user: AuthUser; barbershop: Barbershop }>(
    "/auth/onboard", {
      method: "POST",
      body: JSON.stringify({ fullName: input.fullName, barbershopName: input.barbershopName }),
    }, token);
  persistProfile(profile);
  emit();
  return { token, ...profile };
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email, password: input.password,
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session) throw new Error("Não foi possível autenticar");
  const token = data.session.access_token;
  cachedToken = token;
  const profile = await callApi<{ user: AuthUser; barbershop: Barbershop }>(
    "/auth/me", { method: "GET" }, token);
  persistProfile(profile);
  emit();
  return { token, ...profile };
}

export async function fetchMe(): Promise<AuthSession | null> {
  const token = await readToken();
  if (!token) { persistProfile(null); return null; }
  try {
    const profile = await callApi<{ user: AuthUser; barbershop: Barbershop }>(
      "/auth/me", { method: "GET" }, token);
    persistProfile(profile);
    return { token, ...profile };
  } catch {
    persistProfile(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  cachedToken = null;
  persistProfile(null);
  emit();
}

function translateAuthError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha inválidos";
  if (/User already registered/i.test(msg))  return "E-mail já cadastrado";
  if (/Email not confirmed/i.test(msg))      return "Confirme seu e-mail antes de entrar";
  return msg;
}
