const TOKEN_KEY = "barbermetrics.jwt";
const USER_KEY = "barbermetrics.user";

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

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getSession(): AuthSession | null {
  const token = getToken();
  if (!token) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { token, user: parsed.user, barbershop: parsed.barbershop };
  } catch {
    return null;
  }
}

function persist(s: AuthSession | null) {
  try {
    if (s) {
      localStorage.setItem(TOKEN_KEY, s.token);
      localStorage.setItem(USER_KEY, JSON.stringify({ user: s.user, barbershop: s.barbershop }));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch { /* ignore quota errors */ }
  listeners.forEach((l) => l(s));
}

export function onAuthChange(fn: (s: AuthSession | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
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
  const session = await request<AuthSession>("/auth/signup", { method: "POST", body: JSON.stringify(input) });
  persist(session);
  return session;
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const session = await request<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(input) });
  persist(session);
  return session;
}

export async function fetchMe(): Promise<AuthSession | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const session = await request<AuthSession>("/auth/me", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    persist(session);
    return session;
  } catch {
    persist(null);
    return null;
  }
}

export function logout(): void {
  persist(null);
}
