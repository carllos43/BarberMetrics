import { useState, useEffect } from "react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Play, Square, Users, DollarSign, Clock, TrendingUp,
  Scissors, Activity, Timer, Coffee, CheckCircle2, Target, Zap,
} from "lucide-react";

// 🔥 BANCO FAKE
import { getClientes, addCliente } from "@/services/localDatabase";

const LS_KEY = "barbermetrics_timer_start";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: 30_000,
    },
  });

  // 🔥 ESTADO DO BANCO FAKE
  const [clientesFake, setClientesFake] = useState<any[]>([]);

  useEffect(() => {
    setClientesFake(getClientes());
  }, []);

  function criarClienteFake() {
    addCliente({
      nome: "Cliente Teste",
      telefone: "999999999"
    });
    setClientesFake(getClientes());
  }

  const [localTimerActive, setLocalTimerActive] = useState<boolean>(() => {
    return localStorage.getItem(LS_KEY) !== null;
  });

  useEffect(() => {
    if (summary !== undefined) {
      setLocalTimerActive(summary.isTimerActive);
    }
  }, [summary?.isTimerActive]);

  const isTimerActive = localTimerActive;
  const hasData = (summary?.clientsToday ?? 0) > 0;

  const idleMinutes = Math.max(
    0,
    (summary?.totalWorkingMinutes ?? 0) - (summary?.totalServiceMinutes ?? 0)
  );

  const avgTicket =
    hasData && summary
      ? summary.grossRevenue / summary.clientsToday
      : 0;

  const remaining = Math.max(
    0,
    (summary?.chairGoal ?? 0) - (summary?.barberEarnings ?? 0)
  );

  const cutsLeft =
    avgTicket > 0
      ? Math.ceil(remaining / (avgTicket * 0.6))
      : 0;

  const minimumMet =
    (summary?.barberEarnings ?? 0) >= (summary?.minimumDailyGoal ?? 0) &&
    (summary?.minimumDailyGoal ?? 0) > 0;

  return (
    <MobileLayout title="BarberMetrics">
      <div className="p-4 space-y-5 pb-8">

        {/* BOTÃO TIMER */}
        <section>
          {isLoading && !summary ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : isTimerActive ? (
            <Button
              size="lg"
              className="w-full h-16 bg-destructive text-white"
              onClick={() => setLocation("/timer")}
            >
              <Square className="mr-2" />
              Corte em andamento
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full h-16"
              onClick={() => setLocation("/timer")}
            >
              <Play className="mr-2" />
              Iniciar Corte
            </Button>
          )}
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader><CardTitle>Clientes Hoje</CardTitle></CardHeader>
            <CardContent>
              {summary?.clientsToday ?? 0}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Seu Ganho</CardTitle></CardHeader>
            <CardContent>
              {formatCurrency(summary?.barberEarnings ?? 0)}
            </CardContent>
          </Card>
        </section>

        {/* 🔥 BANCO FAKE */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Teste Banco Fake</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">

              <Button onClick={criarClienteFake}>
                Adicionar Cliente Fake
              </Button>

              {clientesFake.map((c) => (
                <div key={c.id} className="border-b py-1">
                  {c.nome}
                </div>
              ))}

            </CardContent>
          </Card>
        </section>

      </div>
    </MobileLayout>
  );
}
