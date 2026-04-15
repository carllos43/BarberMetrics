import { useState, useEffect } from "react";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Play, Square, Users, DollarSign, Clock, TrendingUp } from "lucide-react";

const LS_KEY = "barbermetrics_timer_start";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 30_000 },
  });

  // Read localStorage immediately so the button shows correct state even before server responds
  const [localTimerActive, setLocalTimerActive] = useState<boolean>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved !== null;
  });

  useEffect(() => {
    if (summary !== undefined) {
      setLocalTimerActive(summary.isTimerActive);
    }
  }, [summary?.isTimerActive]);

  const isTimerActive = localTimerActive;

  return (
    <MobileLayout title="BarberMetrics">
      <div className="p-4 space-y-6 pb-8">
        {/* Main Action */}
        <section>
          {isLoading && !summary ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : isTimerActive ? (
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg"
              onClick={() => setLocation("/timer")}
            >
              <Square className="mr-2 h-6 w-6 fill-current" />
              <span className="animate-pulse">Corte em Andamento</span>
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold shadow-lg"
              onClick={() => setLocation("/timer")}
            >
              <Play className="mr-2 h-6 w-6 fill-current" />
              Iniciar Corte
            </Button>
          )}
        </section>

        {/* At a glance */}
        <section className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground opacity-70" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-3xl font-bold text-foreground">{summary?.clientsToday ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seu Ganho</CardTitle>
              <DollarSign className="h-4 w-4 text-primary opacity-70" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-3xl font-bold text-primary">{formatCurrency(summary?.barberEarnings ?? 0)}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground opacity-70" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">{Math.round(summary?.avgDurationMinutes ?? 0)} min</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Hora</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground opacity-70" />
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold text-foreground">{formatCurrency(summary?.earningsPerHour ?? 0)}</div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Daily Goal */}
        <section>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span className="text-muted-foreground">Meta Diária</span>
                {isLoading ? <Skeleton className="h-5 w-16" /> : (
                  <span className="text-foreground font-bold">{Math.round(summary?.goalProgress ?? 0)}%</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {isLoading ? <Skeleton className="h-3 w-full rounded-full" /> : (
                <Progress value={summary?.goalProgress ?? 0} className="h-3 bg-secondary/50" />
              )}
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(summary?.barberEarnings ?? 0)}</span>
                <span>{formatCurrency(summary?.dailyGoal ?? 0)}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MobileLayout>
  );
}
