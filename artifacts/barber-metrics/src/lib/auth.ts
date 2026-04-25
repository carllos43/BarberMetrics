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

const listeners = new Set<(s: AuthSession | null) => void>();

let cachedToken: string | null = null;
let cachedProfile: { user: AuthUser; barbershop: Barbershop } | null = null;

try {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw) cachedProfile = JSON.parse(raw);
} catch {
  /* ignore */
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
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore quota errors */
  }
}

function emit() {
  const s = getSession();
  listeners.forEach((l) => l(s));
}

export function onAuthChange(fn: (s: AuthSession | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "minha-barbearia";
}

/**
 * Build a profile (user + barbershop) directly from a Supabase auth user,
 * with no backend call. Reads custom fields from user_metadata when present.
 */
function profileFromSupabaseUser(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { user: AuthUser; barbershop: Barbershop } {
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = authUser.email ?? "";
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (email ? email.split("@")[0] : "Profissional");
  const role = (typeof meta.role === "string" && meta.role) || "barber";
  const commissionPercent =
    typeof meta.commission_percent === "number" ? meta.commission_percent : 50;
  const barbershopName =
    (typeof meta.barbershop_name === "string" && meta.barbershop_name) ||
    `Barbearia de ${fullName.split(" ")[0]}`;
  const barbershopId =
    (typeof meta.barbershop_id === "string" && meta.barbershop_id) || authUser.id;
  return {
    user: { id: authUser.id, email, fullName, role, commissionPercent },
    barbershop: { id: barbershopId, name: barbershopName, slug: slugify(barbershopName) },
  };
}

export async function signup(input: {
  email: string;
  password: string;
  fullName: string;
  barbershopName?: string;
}): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        barbershop_name: input.barbershopName ?? `Barbearia de ${input.fullName.split(" ")[0]}`,
      },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session || !data.user) {
    throw new Error("Conta criada — confirme o e-mail antes de entrar.");
  }
  cachedToken = data.session.access_token;
  const profile = profileFromSupabaseUser(data.user);
  persistProfile(profile);
  emit();
  return { token: cachedToken, ...profile };
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session || !data.user) throw new Error("Não foi possível autenticar");
  cachedToken = data.session.access_token;
  const profile = profileFromSupabaseUser(data.user);
  persistProfile(profile);
  emit();
  return { token: cachedToken, ...profile };
}

export async function fetchMe(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session.user) {
    cachedToken = null;
    persistProfile(null);
    return null;
  }
  cachedToken = session.access_token;
  const profile = profileFromSupabaseUser(session.user);
  persistProfile(profile);
  return { token: cachedToken, ...profile };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  cachedToken = null;
  persistProfile(null);
  emit();
}

// Keep token cache + listeners in sync with Supabase session changes
// (token refresh, sign-out from another tab, etc.)
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
  if (session?.user) {
    persistProfile(profileFromSupabaseUser(session.user));
  } else {
    persistProfile(null);
  }
  emit();
});

function translateAuthError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha inválidos";
  if (/User already registered/i.test(msg)) return "E-mail já cadastrado";
  if (/Email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar";
  return msg;
}
