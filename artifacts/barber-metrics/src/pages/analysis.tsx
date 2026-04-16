import { useState } from "react";
import {
  useGetMonthlyAnalysis,
  getGetMonthlyAnalysisQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, Calendar, Clock, Scissors, Star,
  BarChart2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PRIMARY = "hsl(38 95% 50%)";
const MUTED   = "hsl(38 95% 50% / 0.4)";
const COLORS  = [
  "hsl(38 95% 50%)",
  "hsl(210 90% 58%)",
  "hsl(150 75% 45%)",
  "hsl(280 75% 60%)",
  "hsl(340 80% 58%)",
  "hsl(180 70% 45%)",
];

function currentMonthStr() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit",
  }).format(new Date()).substring(0, 7);
}

function addMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(y, mo - 1, 1));
}

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || PRIMARY }}>
          {p.name}: <span className="font-bold">{typeof p.value === "number" && p.name?.toLowerCase().includes("r$")
            ? formatCurrency(p.value)
            : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function MonthlyAnalysisTab() {
  const [month, setMonth] = useState(currentMonthStr());
  const today = currentMonthStr();
  const isCurrentMonth = month === today;

  const { data, isLoading } = useGetMonthlyAnalysis(
    { month },
    { query: { queryKey: getGetMonthlyAnalysisQueryKey({ month }) } }
  );

  const prevMonth = () => setMonth(m => addMonth(m, -1));
  const nextMonth = () => { if (!isCurrentMonth) setMonth(m => addMonth(m, 1)); };

  // --- data transformations ---
  const topDaysChart = (data?.topDays ?? []).slice(0, 8).map(d => {
    let label = d.date;
    try { label = format(parseISO(d.date), "dd/MM", { locale: ptBR }); } catch {}
    return { label, earnings: d.earnings, cortes: d.appointmentCount };
  });

  const hoursAll: { hour: number; count: number }[] = [];
  for (let h = 7; h <= 21; h++) {
    const found = data?.busiestHours.find(x => x.hour === h);
    hoursAll.push({ hour: h, count: found?.count ?? 0 });
  }
  const maxHourCount = Math.max(...hoursAll.map(h => h.count), 1);

  const weekdayChart = (data?.weekdayStats ?? []).map(w => ({
    name: w.dayName,
    media: w.avgEarnings,
    atendimentos: w.count,
  }));

  const serviceChart = (data?.serviceRanking ?? []).map((s, i) => ({
    name: s.service,
    value: s.count,
    earnings: s.totalEarnings,
    fill: COLORS[i % COLORS.length],
  }));

  const totalServices = serviceChart.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-5 pb-8">

      {/* Month Navigator */}
      <div className="flex items-center justify-between px-1">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="w-9 h-9 rounded-xl">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-base font-semibold capitalize text-foreground">{monthLabel(month)}</span>
        <Button
          variant="ghost" size="icon"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-9 h-9 rounded-xl opacity-100 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-card border-border/40">
            <CardContent className="p-3 flex flex-col items-center justify-center text-center">
              <Calendar className="w-4 h-4 text-primary mb-1" />
              <div className="text-lg font-bold text-foreground">{data?.workedDays ?? 0}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">dias<br/>trabalhados</div>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-3 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-4 h-4 text-primary mb-1" />
              <div className="text-lg font-bold text-primary">{formatCurrency(data?.dailyAverage ?? 0)}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">média<br/>diária</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/40">
            <CardContent className="p-3 flex flex-col items-center justify-center text-center">
              <Star className="w-4 h-4 text-amber-400 mb-1" />
              <div className="text-lg font-bold text-foreground">{formatCurrency(data?.monthlyForecast ?? 0)}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">previsão<br/>mês</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Days */}
      <Card className="bg-card border-border/40">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Dias mais lucrativos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {isLoading ? <Skeleton className="h-40 w-full rounded-lg" /> : topDaysChart.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sem dados para este mês.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topDaysChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${v}`}
                />
                <RechartsTooltip
                  content={<CustomTooltipBar />}
                  cursor={{ fill: "hsl(var(--accent) / 0.3)" }}
                />
                <Bar dataKey="earnings" name="R$ ganho" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {topDaysChart.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? PRIMARY : MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {!isLoading && topDaysChart.length > 0 && (
            <div className="flex items-center gap-2 mt-2 px-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PRIMARY }} />
              <span className="text-xs text-muted-foreground">
                Melhor dia: <span className="font-semibold text-foreground">{topDaysChart[0]?.label}</span> — {formatCurrency(topDaysChart[0]?.earnings ?? 0)} ({topDaysChart[0]?.cortes} corte{topDaysChart[0]?.cortes !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Busiest Hours */}
      <Card className="bg-card border-border/40">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Horários mais movimentados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {isLoading ? <Skeleton className="h-36 w-full rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={hoursAll} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={h => `${h}h`}
                />
                <YAxis hide />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const h = payload[0].payload.hour;
                    const c = payload[0].payload.count;
                    return (
                      <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs shadow-lg">
                        <p className="font-semibold text-foreground">{h}:00 – {h+1}:00</p>
                        <p className="text-primary font-bold">{c} atendimento{c !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  }}
                  cursor={{ fill: "hsl(var(--accent) / 0.3)" }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {hoursAll.map((h, i) => (
                    <Cell
                      key={i}
                      fill={h.count === maxHourCount && h.count > 0 ? PRIMARY : h.count > 0 ? MUTED : "hsl(var(--border) / 0.15)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {!isLoading && data && data.busiestHours.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              Pico: <span className="font-semibold text-foreground">{data.busiestHours[0].hour}h – {data.busiestHours[0].hour + 1}h</span>
              {" "}({data.busiestHours[0].count} atendimentos)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Weekday Stats */}
      <Card className="bg-card border-border/40">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Média por dia da semana
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? <Skeleton className="h-40 w-full rounded-lg" /> : weekdayChart.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sem dados.</p>
          ) : (
            <div className="space-y-2.5">
              {weekdayChart.sort((a, b) => b.media - a.media).map((w, i) => {
                const maxMedia = weekdayChart[0]?.media || 1;
                const pct = (w.media / maxMedia) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${i === 0 ? "text-primary" : "text-foreground"}`}>{w.name}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{w.atendimentos} corte{w.atendimentos !== 1 ? "s" : ""}</span>
                        <span className={`font-bold ${i === 0 ? "text-primary" : "text-foreground"}`}>{formatCurrency(w.media)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-accent/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: i === 0 ? PRIMARY : MUTED,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Ranking */}
      <Card className="bg-card border-border/40">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            Ranking de serviços
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? <Skeleton className="h-40 w-full rounded-lg" /> : serviceChart.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sem dados.</p>
          ) : (
            <>
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceChart}
                        cx="50%" cy="50%"
                        innerRadius={30} outerRadius={54}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {serviceChart.map((s, i) => (
                          <Cell key={i} fill={s.fill} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {serviceChart.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.fill }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate max-w-[90px]">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-1">{s.value}x</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{formatCurrency(s.earnings)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-muted-foreground border-t border-border/30 pt-3">
                <div>
                  <div className="font-bold text-sm text-foreground">{totalServices}</div>
                  <div>total</div>
                </div>
                <div>
                  <div className="font-bold text-sm text-primary">{serviceChart[0]?.name || "—"}</div>
                  <div>mais feito</div>
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">{formatCurrency(data?.totalEarnings ?? 0)}</div>
                  <div>total ganho</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
