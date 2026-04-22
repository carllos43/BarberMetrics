import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ChartGrouping = "daily" | "weekly" | "monthly";

export interface AppSettings {
  // Global
  businessName: string;
  currency: "BRL";
  dateFormat: "dd/MM/yyyy" | "yyyy-MM-dd";
  // Timer
  hourlyRate: number;
  timerMode: "auto" | "manual";
  // Finance
  expenseCategories: string[];
  includeCommissionInFinance: boolean;
  // Metrics
  chartGrouping: ChartGrouping;
  // Reports
  reportIncludeClient: boolean;
  reportIncludeCommission: boolean;
}

const DEFAULTS: AppSettings = {
  businessName: "BarberMetrics",
  currency: "BRL",
  dateFormat: "dd/MM/yyyy",
  hourlyRate: 0,
  timerMode: "auto",
  expenseCategories: ["Despesa Fixa", "Produtos", "Marketing", "Outros"],
  includeCommissionInFinance: true,
  chartGrouping: "daily",
  reportIncludeClient: false,
  reportIncludeCommission: true,
};

const KEY = "barbermetrics.settings";

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

interface Ctx {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
  open: () => void;
}

const SettingsCtx = createContext<Ctx | null>(null);
const OpenerCtx = createContext<{ open: () => void }>({ open: () => {} });

export function SettingsProvider({ children, onOpenModal }: { children: ReactNode; onOpenModal: () => void }) {
  const [settings, setSettings] = useState<AppSettings>(() => load());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  const update = (patch: Partial<AppSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const reset = () => setSettings(DEFAULTS);

  return (
    <SettingsCtx.Provider value={{ settings, update, reset, open: onOpenModal }}>
      <OpenerCtx.Provider value={{ open: onOpenModal }}>
        {children}
      </OpenerCtx.Provider>
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useOpenSettings() {
  return useContext(OpenerCtx).open;
}
