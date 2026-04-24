import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  LazyDashboard,
  LazyTimer,
  LazyAppointments,
  LazyProductivity,
  LazyFinances,
  LazyReports,
  LazyLogin,
  LazyNotFound,
  PageSuspense,
  prefetchAllRoutesWhenIdle,
} from "@/lib/lazyPages";
import { useEffect, useState } from "react";
import { fetchMe, getSession, onAuthChange, type AuthSession } from "@/lib/auth";
import { SettingsProvider } from "@/lib/settings";
import { SettingsModal } from "@/components/SettingsModal";

// Defaults para "stale-while-revalidate":
// - dados ficam "frescos" por 30s (não dispara nova request se você só navega)
// - mas, ao montar/refazer foco, re-busca em background mostrando o cache antigo
// - guarda em memória por 5 min antes de garbage collect
// - 1 retry só pra não pendurar a UI em rede ruim
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AppRoutes() {
  return (
    <PageSuspense>
      <Switch>
        <Route path="/" component={LazyDashboard} />
        <Route path="/timer" component={LazyTimer} />
        <Route path="/atendimentos" component={LazyAppointments} />
        <Route path="/produtividade" component={LazyProductivity} />
        <Route path="/financas" component={LazyFinances} />
        <Route path="/relatorios" component={LazyReports} />
        <Route component={LazyNotFound} />
      </Switch>
    </PageSuspense>
  );
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(getSession());
  const [loadingSession, setLoadingSession] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    // Depois que a tela inicial pintar, baixa em background o JS das outras
    // rotas pra que clicar na navegação seja instantâneo.
    prefetchAllRoutesWhenIdle();
  }, []);

  useEffect(() => {
    fetchMe().then((s) => {
      setSession(s);
      setLoadingSession(false);
    }).catch(() => setLoadingSession(false));
    const off = onAuthChange((s) => {
      setSession(s);
      queryClient.clear();
    });
    return () => { off(); };
  }, []);

  if (loadingSession && !session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider onOpenModal={() => setSettingsOpen(true)}>
          {session ? (
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
          ) : (
            <LoginPage />
          )}
          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
          <Toaster />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
