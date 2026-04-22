import { useState, useEffect } from "react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Play, Square } from "lucide-react";
import { logout } from "@/lib/auth";

const LS_KEY = "barbermetrics_timer_start";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: 30_000,
    },
  });

  const [localTimerActive, setLocalTimerActive] = useState<boolean>(() => {
    return localStorage.getItem(LS_KEY) !== null;
  });

  useEffect(() => {
    if (summary !== undefined) {
      setLocalTimerActive(summary.isTimerActive);
    }
  }, [summary?.isTimerActive]);

  const isTimerActive = localTimerActive;

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
            <CardContent>{summary?.clientsToday ?? 0}</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Seu Ganho</CardTitle></CardHeader>
            <CardContent>{formatCurrency(summary?.barberEarnings ?? 0)}</CardContent>
          </Card>
        </section>

        <section>
          <Button variant="outline" className="w-full" onClick={() => logout()}>
            Sair
          </Button>
        </section>

      </div>
    </MobileLayout>
  );
}
