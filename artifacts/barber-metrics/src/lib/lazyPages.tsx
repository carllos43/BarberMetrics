import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Importadores dinâmicos: cada rota vira seu próprio chunk no build do Vite.
 * Manter este mapa permite usar `prefetchRoute(path)` em qualquer lugar
 * (BottomNav no hover, App no idle) pra baixar o JS antes do clique.
 */
const importers: Record<string, () => Promise<{ default: ComponentType<unknown> }>> = {
  "/": () => import("@/pages/dashboard"),
  "/timer": () => import("@/pages/timer"),
  "/atendimentos": () => import("@/pages/appointments"),
  "/produtividade": () => import("@/pages/productivity"),
  "/financas": () => import("@/pages/finances"),
  "/relatorios": () => import("@/pages/reports"),
};

export const LazyDashboard = lazy(importers["/"]);
export const LazyTimer = lazy(importers["/timer"]);
export const LazyAppointments = lazy(importers["/atendimentos"]);
export const LazyProductivity = lazy(importers["/produtividade"]);
export const LazyFinances = lazy(importers["/financas"]);
export const LazyReports = lazy(importers["/relatorios"]);
export const LazyLogin: LazyExoticComponent<ComponentType<unknown>> = lazy(
  () => import("@/pages/login"),
);
export const LazyNotFound: LazyExoticComponent<ComponentType<unknown>> = lazy(
  () => import("@/pages/not-found"),
);

/** Cache pra não disparar a mesma promessa várias vezes. */
const inflight = new Map<string, Promise<unknown>>();

export function prefetchRoute(path: string): void {
  const fn = importers[path];
  if (!fn) return;
  if (inflight.has(path)) return;
  // Dispara o import; o Vite/Rollup já dedupe via cache do módulo,
  // mas guardamos a promessa pra evitar reentrância.
  inflight.set(path, fn().catch(() => inflight.delete(path)));
}

/** Pré-carrega todas as rotas em idle, sem competir com o render inicial. */
export function prefetchAllRoutesWhenIdle(): void {
  const idle =
    (globalThis as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback ??
    ((cb: () => void) => setTimeout(cb, 1500));
  idle(() => {
    for (const path of Object.keys(importers)) prefetchRoute(path);
  }, { timeout: 4000 });
}

/** Skeleton mostrado enquanto o chunk da página chega. */
export function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] p-4 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
