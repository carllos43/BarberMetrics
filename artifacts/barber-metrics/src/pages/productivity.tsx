import { useState } from "react";
import { 
  useGetProductivityStats, 
  useGetProductivityTips,
  getGetProductivityStatsQueryKey,
  getGetProductivityTipsQueryKey,
  GetProductivityStatsPeriod,
  GetProductivityTipsPeriod
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Lightbulb, Zap, TrendingUp, Clock, AlertCircle } from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(210 100% 60%)', 'hsl(150 100% 50%)', 'hsl(280 80% 50%)', 'hsl(340 80% 60%)'];

export default function ProductivityPage() {
  const [period, setPeriod] = useState<GetProductivityStatsPeriod>("week");
  
  const { data: stats, isLoading: isLoadingStats } = useGetProductivityStats(
    { period },
    { query: { queryKey: getGetProductivityStatsQueryKey({ period }) } }
  );

  const { data: tips, isLoading: isLoadingTips } = useGetProductivityTips(
    { period: period as GetProductivityTipsPeriod },
    { query: { queryKey: getGetProductivityTipsQueryKey({ period: period as GetProductivityTipsPeriod }) } }
  );

  return (
    <MobileLayout title="Produtividade">
      <div className="p-4 space-y-6 pb-8">
        <div className="flex justify-between items-center">
          <Select value={period} onValueChange={(val) => setPeriod(val as GetProductivityStatsPeriod)}>
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
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center text-muted-foreground mb-2">
                <Clock className="w-4 h-4 mr-2 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider">Tempo Inativo</span>
              </div>
              {isLoadingStats ? <Skeleton className="h-8 w-20" /> : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    {formatMinutes(stats?.idleMinutes || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Sem produzir
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center text-muted-foreground mb-2">
                <Zap className="w-4 h-4 mr-2 text-amber-500" />
                <span className="text-xs font-medium uppercase tracking-wider">Perda Est.</span>
              </div>
              {isLoadingStats ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold text-amber-500">
                    {formatCurrency(stats?.potentialExtraEarnings || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ganho não realizado
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Serviços por Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingStats ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats?.serviceBreakdown && stats.serviceBreakdown.length > 0 ? (
              <div className="h-[200px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.serviceBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="service" type="category" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} width={100} />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]}>
                      {stats.serviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Tips */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground px-1 pt-2 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-amber-400" />
            Insights do Metric
          </h3>
          
          {isLoadingTips ? (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : tips && tips.length > 0 ? (
            tips.map((tip) => (
              <Card key={tip.id} className="bg-card/40 border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                <CardContent className="p-4 pl-5">
                  <p className="text-sm text-foreground font-medium mb-2">{tip.message}</p>
                  {tip.impact && (
                    <div className="inline-flex items-center text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      Impacto estimado: {tip.impact}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card border-border/50 border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Trabalhe mais alguns dias para receber insights automáticos sobre sua produtividade.</p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </MobileLayout>
  );
}
