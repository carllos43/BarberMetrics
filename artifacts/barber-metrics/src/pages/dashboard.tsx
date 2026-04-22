import { useState, useEffect } from "react";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetProductivityStats, getGetProductivityStatsQueryKey,
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Play, Square, Wallet, Scissors, Clock, Receipt,
  TrendingUp, TrendingDown, Target,
} from "lucide-react";
import { getSession } from "@/lib/auth";

const LS_KEY = "barbermetrics_timer_start";

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: number;
  trendLabel?: string;
}

function SummaryCard({ label, value, icon, gradient, trend, trendLabel }: SummaryCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`icon-pill ${gradient}`}>{icon}</div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
              trend >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
            }`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend >= 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        <div className="mt-3 text-xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
        {trendLabel && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{trendLabel}</div>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const session = getSession();

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 30_000 },
  });
  const { data: weekStats } = useGetProductivityStats(
    { period: "week" },
    { query: { queryKey: getGetProductivityStatsQueryKey({ period: "week" }) } }
  );

  const [localTimerActive, setLocalTimerActive] = useState<boolean>(
    () => localStorage.getItem(LS_KEY) !== null
  );
  useEffect(() => {
    if (summary !== undefined) setLocalTimerActive(summary.isTimerActive);
  }, [summary?.isTimerActive]);

  const isTimerActive = localTimerActive;
  const clientsToday = summary?.clientsToday ?? 0;
  const grossRevenue = summary?.grossRevenue ?? 0;
  const earnings = summary?.barberEarnings ?? 0;
  const avgTicket = clientsToday > 0 ? grossRevenue / clientsToday : 0;
  const workMin = summary?.totalWorkingMinutes ?? 0;
  const goal = summary?.dailyGoal ?? 0;
  const goalPct = Math.min(100, summary?.goalProgress ?? 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <MobileLayout title={`${greeting}!`} subtitle={session?.user.fullName ?? session?.barbershop.name}>
      <div className="p-4 space-y-5 pb-8">

        {/* Hero CTA */}
        <section>
          {isLoading && !summary ? (
            <Skeleton className="h-20 w-full rounded-2xl" />
          ) : isTimerActive ? (
            <Button
              size="lg"
              className="w-full h-20 rounded-2xl text-base font-bold bg-destructive text-white shadow-lg shadow-destructive/30"
              onClick={() => setLocation("/timer")}
            >
              <Square className="mr-2 h-5 w-5 fill-current" />
              Corte em andamento
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full h-20 rounded-2xl text-base font-bold shadow-lg shadow-primary/30"
              onClick={() => setLocation("/timer")}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Iniciar Corte
            </Button>
          )}
        </section>

        {/* Goal progress */}
        {goal > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meta do dia
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground">
                  {formatCurrency(earnings)} / {formatCurrency(goal)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 text-right">{Math.round(goalPct)}% atingida</div>
            </CardContent>
          </Card>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Faturamento"
            value={formatCurrency(grossRevenue)}
            icon={<Wallet className="w-5 h-5" />}
            gradient="grad-green"
            trendLabel={weekStats ? `${formatCurrency(weekStats.grossRevenue)} na semana` : undefined}
          />
          <SummaryCard
            label="Atendimentos"
            value={String(clientsToday)}
            icon={<Scissors className="w-5 h-5" />}
            gradient="grad-purple"
            trendLabel={weekStats ? `${weekStats.totalClients} na semana` : undefined}
          />
          <SummaryCard
            label="Tempo trabalhado"
            value={formatMinutes(workMin)}
            icon={<Clock className="w-5 h-5" />}
            gradient="grad-blue"
            trendLabel={`Médio ${Math.round(summary?.avgDurationMinutes ?? 0)} min/corte`}
          />
          <SummaryCard
            label="Ticket médio"
            value={formatCurrency(avgTicket)}
            icon={<Receipt className="w-5 h-5" />}
            gradient="grad-amber"
            trendLabel={`Seu ganho ${formatCurrency(earnings)}`}
          />
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl glass border-0" onClick={() => setLocation("/atendimentos")}>
            Histórico de cortes
          </Button>
          <Button variant="outline" className="h-12 rounded-xl glass border-0" onClick={() => setLocation("/relatorios")}>
            Gerar relatório
          </Button>
        </section>
      </div>
    </MobileLayout>
  );
}
