import { useState } from "react";
import {
  useGetProductivityStats,
  getGetProductivityStatsQueryKey,
  GetProductivityStatsPeriod,
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Activity, Timer, Scissors, Coffee, Zap,
  TrendingUp, Target, AlertTriangle, CheckCircle2,
} from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(210 100% 60%)", "hsl(150 80% 45%)", "hsl(280 80% 55%)", "hsl(340 80% 60%)"];

function ProductivityGauge({ pct }: { pct: number }) {
  const color = pct >= 65 ? "text-green-500" : pct >= 40 ? "text-amber-500" : "text-red-500";
  const bgBorder = pct >= 65
    ? "bg-green-500/10 border-green-500/30"
    : pct >= 40
    ? "bg-amber-500/10 border-amber-500/30"
    : "bg-red-500/10 border-red-500/30";
  const barColor = pct >= 65 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  const label = pct >= 65 ? "Excelente" : pct >= 40 ? "Bom" : pct > 0 ? "Baixa" : "—";

  return (
    <div className={`rounded-2xl border p-4 ${bgBorder}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className={`w-5 h-5 ${color}`} />
          <span className="text-sm font-semibold text-foreground">Produtividade</span>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${color}`}>{Math.round(pct)}%</span>
          <div className={`text-xs font-medium ${color}`}>{label}</div>
        </div>
      </div>
      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
        <span className="text-red-500/70">Baixa &lt;40%</span>
        <span className="text-green-500/70">Ótima &gt;65%</span>
      </div>
    </div>
  );
}

export default function ProductivityPage() {
  const [period, setPeriod] = useState<GetProductivityStatsPeriod>("today");

  const { data: stats, isLoading } = useGetProductivityStats(
    { period },
    { query: { queryKey: getGetProductivityStatsQueryKey({ period }) } }
  );

  const hasData = (stats?.totalClients ?? 0) > 0;
  const idleMinutes = Math.max(0, (stats?.totalWorkingMinutes ?? 0) - (stats?.totalServiceMinutes ?? 0));
  const minimumMet = hasData && (stats?.grossRevenue ?? 0) >= (stats?.minimumDailyGoal ?? 0) && (stats?.minimumDailyGoal ?? 0) > 0;
  const chairProgress = (stats?.chairGoal ?? 0) > 0
    ? Math.min(100, ((stats?.grossRevenue ?? 0) / (stats?.chairGoal ?? 1)) * 100)
    : 0;
  const avgTicket = hasData ? (stats?.grossRevenue ?? 0) / (stats?.totalClients ?? 1) : 0;

  const pieData = stats?.serviceBreakdown?.map((s, i) => ({
    name: s.service,
    value: s.count,
    color: COLORS[i % COLORS.length],
  })) ?? [];

  return (
    <MobileLayout title="Métricas">
      <div className="p-4 space-y-5 pb-8">

        {/* Period selector */}
        <div className="flex justify-between items-center">
          <Select value={period} onValueChange={(v) => setPeriod(v as GetProductivityStatsPeriod)}>
            <SelectTrigger className="w-[150px] bg-card border-border h-10 rounded-xl">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          {!isLoading && (
            <div className="text-sm text-muted-foreground bg-accent/40 px-3 py-1.5 rounded-full">
              {stats?.totalClients ?? 0} {(stats?.totalClients ?? 0) === 1 ? "corte" : "cortes"}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!isLoading && !hasData && (
          <Card className="bg-transparent border-dashed border-border/50">
            <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
              <Scissors className="w-10 h-10 opacity-30" />
              <div>
                <p className="font-medium text-foreground">Nenhum atendimento</p>
                <p className="text-sm mt-1">Inicie um corte para ver as métricas.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Productivity gauge */}
        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : hasData ? (
          <ProductivityGauge pct={stats?.productivityPercent ?? 0} />
        ) : null}

        {/* Time breakdown */}
        {(isLoading || hasData) && (
          <Card className="bg-card border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                Tempo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: <Timer className="w-4 h-4 text-primary" />, label: "Trabalhando", value: formatMinutes(stats?.totalWorkingMinutes ?? 0) },
                  { icon: <Scissors className="w-4 h-4 text-primary" />, label: "Atendendo", value: formatMinutes(stats?.totalServiceMinutes ?? 0) },
                  { icon: <Coffee className="w-4 h-4 text-muted-foreground" />, label: "Parado", value: formatMinutes(idleMinutes) },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-accent/50 flex items-center justify-center">
                      {item.icon}
                    </div>
                    {isLoading ? <Skeleton className="h-5 w-12" /> : (
                      <div className="text-sm font-bold text-foreground">{item.value}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Value cards */}
        {(isLoading || hasData) && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Timer className="w-4 h-4" />, label: "Tempo Médio", value: `${Math.round(stats?.avgDurationMinutes ?? 0)} min`, color: "text-foreground" },
              { icon: <Zap className="w-4 h-4 text-amber-500" />, label: "Ticket Médio", value: formatCurrency(avgTicket), color: "text-foreground" },
              { icon: <span className="text-base leading-none">💺</span>, label: "Valor da cadeira/h", value: `${formatCurrency(stats?.chairValuePerHour ?? 0)}/h`, color: "text-foreground" },
              { icon: <TrendingUp className="w-4 h-4 text-primary" />, label: "Seu ganho/hora", value: `${formatCurrency(stats?.barberEarningsPerHour ?? 0)}/h`, color: "text-primary" },
            ].map((item) => (
              <Card key={item.label} className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    {item.icon}
                    <span className="text-[10px] font-medium uppercase tracking-wider leading-tight">{item.label}</span>
                  </div>
                  {isLoading ? <Skeleton className="h-7 w-20" /> : (
                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Goals */}
        {(isLoading || hasData) && ((stats?.minimumDailyGoal ?? 0) > 0 || (stats?.chairGoal ?? 0) > 0) && (
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Metas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {(stats?.minimumDailyGoal ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {minimumMet
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    <div>
                      <div className="text-xs text-muted-foreground">Meta mínima</div>
                      <div className="text-sm font-bold text-foreground">{formatCurrency(stats?.minimumDailyGoal ?? 0)}</div>
                    </div>
                  </div>
                  {isLoading ? <Skeleton className="h-5 w-16" /> : (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      minimumMet ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {minimumMet ? "✓ Atingida" : "Pendente"}
                    </span>
                  )}
                </div>
              )}

              {(stats?.chairGoal ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-primary" /> Meta ideal da cadeira
                    </span>
                    {isLoading ? <Skeleton className="h-4 w-16" /> : (
                      <span className="font-bold text-foreground">{formatCurrency(stats?.chairGoal ?? 0)}</span>
                    )}
                  </div>
                  {!isLoading && (
                    <>
                      <div className="w-full bg-secondary/40 rounded-full h-2">
                        <div className="h-2 rounded-full bg-primary transition-all duration-700" style={{ width: `${chairProgress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(stats?.grossRevenue ?? 0)}</span>
                        <span>{Math.round(chairProgress)}% atingido</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Service breakdown */}
        {hasData && (stats?.serviceBreakdown?.length ?? 0) > 0 && (
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" />
                Serviços
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={44} dataKey="value" paddingAngle={2}>
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {stats?.serviceBreakdown?.map((s, i) => (
                    <div key={s.service} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{s.service}</div>
                        <div className="text-[10px] text-muted-foreground">{s.count}× · {formatCurrency(s.avgValue)}</div>
                      </div>
                      <div className="text-xs font-bold text-foreground">{Math.round(s.percentage)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
