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

const LS_KEY = "barbermetrics_timer_start";

function ProductivityBadge({ pct }: { pct: number }) {
  if (pct === 0) return null;
  const color =
    pct >= 65 ? "bg-green-500/15 text-green-500 border-green-500/30" :
    pct >= 40 ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
    "bg-red-500/15 text-red-500 border-red-500/30";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {Math.round(pct)}%
    </span>
  );
}

function ProductivityBar({ pct }: { pct: number }) {
  const color = pct >= 65 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full bg-secondary/40 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

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
  const hasData = (summary?.clientsToday ?? 0) > 0;

  const idleMinutes = Math.max(0, (summary?.totalWorkingMinutes ?? 0) - (summary?.totalServiceMinutes ?? 0));

  // How many cuts to reach chair goal
  const avgTicket = hasData && summary
    ? summary.grossRevenue / summary.clientsToday
    : 0;
  const remaining = Math.max(0, (summary?.chairGoal ?? 0) - (summary?.barberEarnings ?? 0));
  const cutsLeft = avgTicket > 0 ? Math.ceil(remaining / (avgTicket * 0.6)) : 0;

  const minimumMet = (summary?.barberEarnings ?? 0) >= (summary?.minimumDailyGoal ?? 0) &&
    (summary?.minimumDailyGoal ?? 0) > 0;

  return (
    <MobileLayout title="BarberMetrics">
      <div className="p-4 space-y-5 pb-8">

        {/* ── Timer Button ─────────────────────────────────── */}
        <section>
          {isLoading && !summary ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : isTimerActive ? (
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg rounded-2xl"
              onClick={() => setLocation("/timer")}
            >
              <Square className="mr-2 h-6 w-6 fill-current" />
              <span className="animate-pulse">Corte em Andamento</span>
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold shadow-lg rounded-2xl"
              onClick={() => setLocation("/timer")}
            >
              <Play className="mr-2 h-6 w-6 fill-current" />
              Iniciar Corte
            </Button>
          )}
        </section>

        {/* ── Quick Stats ──────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground opacity-60" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                <div className="text-3xl font-bold text-foreground">{summary?.clientsToday ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seu Ganho</CardTitle>
              <DollarSign className="h-4 w-4 text-primary opacity-70" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : (
                <div className="text-3xl font-bold text-primary">{formatCurrency(summary?.barberEarnings ?? 0)}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground opacity-60" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(summary?.avgDurationMinutes ?? 0)} min
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturamento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground opacity-60" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : (
                <div className="text-2xl font-bold text-foreground">{formatCurrency(summary?.grossRevenue ?? 0)}</div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Day Productivity Panel ───────────────────────── */}
        {hasData && (
          <section>
            <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Resumo do Dia
                  </CardTitle>
                  {isLoading ? <Skeleton className="h-5 w-12" /> : (
                    <ProductivityBadge pct={summary?.productivityPercent ?? 0} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Time breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center text-muted-foreground mb-1">
                      <Timer className="w-3.5 h-3.5 mr-1 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Trabalhando</span>
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-12 mx-auto" /> : (
                      <div className="text-sm font-bold text-foreground">{formatMinutes(summary?.totalWorkingMinutes ?? 0)}</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-muted-foreground mb-1">
                      <Scissors className="w-3.5 h-3.5 mr-1 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Atendendo</span>
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-12 mx-auto" /> : (
                      <div className="text-sm font-bold text-foreground">{formatMinutes(summary?.totalServiceMinutes ?? 0)}</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-muted-foreground mb-1">
                      <Coffee className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wider font-medium">Parado</span>
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-12 mx-auto" /> : (
                      <div className="text-sm font-bold text-muted-foreground">{formatMinutes(idleMinutes)}</div>
                    )}
                  </div>
                </div>

                {/* Productivity bar */}
                {!isLoading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Produtividade</span>
                      <span className="font-semibold text-foreground">{Math.round(summary?.productivityPercent ?? 0)}%</span>
                    </div>
                    <ProductivityBar pct={summary?.productivityPercent ?? 0} />
                  </div>
                )}

                {/* Value metrics */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <span>💺</span> Valor da cadeira
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-16" /> : (
                      <div className="text-sm font-bold text-foreground">
                        {formatCurrency(summary?.chairValuePerHour ?? 0)}/h
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <span>💰</span> Seu ganho/hora
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-16" /> : (
                      <div className="text-sm font-bold text-primary">
                        {formatCurrency(summary?.barberEarningsPerHour ?? 0)}/h
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Goal Progress ─────────────────────────────────── */}
        <section>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Metas do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">

              {/* Minimum goal row */}
              {(summary?.minimumDailyGoal ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {minimumMet ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Meta mínima</div>
                      <div className="text-sm font-semibold text-foreground">
                        {formatCurrency(summary?.minimumDailyGoal ?? 0)}
                      </div>
                    </div>
                  </div>
                  {isLoading ? <Skeleton className="h-5 w-14" /> : (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      minimumMet ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                    }`}>
                      {minimumMet ? "Atingida ✓" : formatCurrency(summary?.barberEarnings ?? 0)}
                    </span>
                  )}
                </div>
              )}

              {/* Chair goal bar */}
              {(summary?.chairGoal ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      <span>Meta ideal da cadeira</span>
                    </div>
                    {isLoading ? <Skeleton className="h-4 w-20" /> : (
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary?.chairGoal ?? 0)}
                      </span>
                    )}
                  </div>
                  {!isLoading && (
                    <>
                      <Progress
                        value={Math.min(100, ((summary?.barberEarnings ?? 0) / (summary?.chairGoal ?? 1)) * 100)}
                        className="h-2.5 bg-secondary/50"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(summary?.barberEarnings ?? 0)}</span>
                        <span>{formatCurrency(summary?.chairGoal ?? 0)}</span>
                      </div>
                      {remaining > 0 && (
                        <p className="text-xs text-center text-muted-foreground pt-1">
                          Faltam <span className="text-foreground font-semibold">{formatCurrency(remaining)}</span>
                          {cutsLeft > 0 && <> ≈ <span className="text-primary font-semibold">{cutsLeft} cortes</span></>}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Fallback: daily goal if no chair goal */}
              {(summary?.chairGoal ?? 0) === 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Meta diária</span>
                    {isLoading ? <Skeleton className="h-4 w-12" /> : (
                      <span className="font-bold text-foreground">{Math.round(summary?.goalProgress ?? 0)}%</span>
                    )}
                  </div>
                  {isLoading ? <Skeleton className="h-3 w-full rounded-full" /> : (
                    <Progress value={summary?.goalProgress ?? 0} className="h-3 bg-secondary/50" />
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(summary?.barberEarnings ?? 0)}</span>
                    <span>{formatCurrency(summary?.dailyGoal ?? 0)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </MobileLayout>
  );
}
