import { supabase } from "./supabase";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");

export type CategoriaDestino = "gasto_livre" | "conta_fixa" | "reserva";

export interface Withdrawal {
  id: number;
  cycleId: number;
  valor: number;
  categoriaDestino: CategoriaDestino;
  descricao: string | null;
  isExcedente: boolean;
  occurredAt: string;
}
export interface PersonalBill {
  id: number;
  nome: string;
  valor: number;
  diaVencimento: number;
  categoria: string;
  ativa: boolean;
}
export interface PersonalFinances {
  saldoBanco: number;
  saldoGuardado: number;
  percentualCaixinha: number;
  limiteLazer: number;
  limiteComida: number;
  limiteOutros: number;
}
export interface WeeklyCycle {
  id: number;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  saldoProduzido: number;
  totalVales: number;
  saldoFinal: number | null;
}
export interface SaldoSemanal {
  cycleId: number;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  produzido: number;
  vales: number;
  saldoDisponivel: number;
  diasRestantes: number;
  limiteDiarioSugerido: number;
}
export interface PersonalAlert {
  kind: "vale_excedente" | "conta_vence_24h" | "ajuste_domingo" | "ciclo_pendente_fechamento";
  severity: "info" | "warn" | "danger";
  message: string;
  meta?: Record<string, unknown>;
}
export interface PersonalOverview {
  semana: SaldoSemanal;
  pessoal: PersonalFinances;
  contas: PersonalBill[];
  alerts: PersonalAlert[];
}

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Sem sessão");
  return t;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = await token();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${t}`,
      ...(init.headers ?? {}),
    },
  });
  const txt = await res.text();
  const body = txt ? JSON.parse(txt) : null;
  if (!res.ok) throw new Error(body?.error ?? body?.message ?? `Erro ${res.status}`);
  return (body?.data ?? body) as T;
}

export const pf = {
  overview: () => api<PersonalOverview>("/personal-finances/overview"),
  cycles: (limit = 12) => api<WeeklyCycle[]>(`/personal-finances/cycles?limit=${limit}`),
  updateSettings: (patch: Partial<PersonalFinances>) =>
    api<PersonalFinances>("/personal-finances/settings", { method: "PUT", body: JSON.stringify(patch) }),
  createWithdrawal: (input: { valor: number; categoriaDestino: CategoriaDestino; descricao?: string }) =>
    api<Withdrawal>("/personal-finances/withdrawals", { method: "POST", body: JSON.stringify(input) }),
  updateWithdrawal: (id: number, patch: Partial<{ valor: number; categoriaDestino: CategoriaDestino; descricao: string }>) =>
    api<Withdrawal>(`/personal-finances/withdrawals/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteWithdrawal: (id: number) =>
    api<void>(`/personal-finances/withdrawals/${id}`, { method: "DELETE" }),
  closeWeek: (cycleId: number) =>
    api<{ cycle: WeeklyCycle; saldoBanco: number; saldoGuardado: number }>(
      "/personal-finances/close-week", { method: "POST", body: JSON.stringify({ cycleId }) },
    ),
  bills: {
    list: () => api<PersonalBill[]>("/personal-bills"),
    create: (input: { nome: string; valor: number; diaVencimento: number; categoria?: string; ativa?: boolean }) =>
      api<PersonalBill>("/personal-bills", { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, patch: Partial<PersonalBill>) =>
      api<PersonalBill>(`/personal-bills/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
    remove: (id: number) =>
      api<void>(`/personal-bills/${id}`, { method: "DELETE" }),
  },
};
