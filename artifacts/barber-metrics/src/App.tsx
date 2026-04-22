import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TimerPage from "@/pages/timer";
import AppointmentsPage from "@/pages/appointments";
import ProductivityPage from "@/pages/productivity";
import FinancesPage from "@/pages/finances";
import ReportsPage from "@/pages/reports";
import LoginPage from "@/pages/login";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/timer" component={TimerPage} />
      <Route path="/atendimentos" component={AppointmentsPage} />
      <Route path="/produtividade" component={ProductivityPage} />
      <Route path="/financas" component={FinancesPage} />
      <Route path="/relatorios" component={ReportsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Reset query cache so user-scoped data is refetched on login/logout
      queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {session ? (
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        ) : (
          <LoginPage />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
