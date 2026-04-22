import { useMemo, useState } from "react";
import { format, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, FileText, CalendarRange, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetStatement, useGetFinancialSummary, useGetProductivityStats,
  getGetStatementQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/lib/settings";
import { generateReportPdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

type Quick = "today" | "7d" | "30d" | "month" | "custom";

function fmtIso(d: Date) { return format(d, "yyyy-MM-dd"); }

function rangeFor(q: Quick, custom: { start: string; end: string }): { start: string; end: string } {
  const today = new Date();
  switch (q) {
    case "today":  return { start: fmtIso(today), end: fmtIso(today) };
    case "7d":     return { start: fmtIso(subDays(today, 6)), end: fmtIso(today) };
    case "30d":    return { start: fmtIso(subDays(today, 29)), end: fmtIso(today) };
    case "month":  return { start: fmtIso(startOfMonth(today)), end: fmtIso(today) };
    case "custom": return custom;
  }
}

const QUICKS: { key: Quick; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d",    label: "7 dias" },
  { key: "30d",   label: "30 dias" },
  { key: "month", label: "Este mês" },
  { key: "custom",label: "Personalizado" },
];

export default function ReportsPage() {
  const [quick, setQuick] = useState<Quick>("month");
  const [custom, setCustom] = useState({
    start: fmtIso(startOfMonth(new Date())),
    end:   fmtIso(new Date()),
  });
  const { settings } = useSettings();
  const { toast } = useToast();

  const range = rangeFor(quick, custom);

  const { data: statement, isLoading: loadingStmt } = useGetStatement(
    { start: range.start, end: range.end },
    { query: { queryKey: getGetStatementQueryKey({ start: range.start, end: range.end }) } }
  );
  const { data: finance } = useGetFinancialSummary();
  const { data: productivity } = useGetProductivityStats({ period: "month" });

  const totals = useMemo(() => {
    if (!statement) return { gross: 0, net: 0 };
    return statement.reduce(
      (acc, c) => ({
        gross: acc.gross + Number(c.value),
        net:   acc.net   + Number(c.barberEarnings),
      }),
      { gross: 0, net: 0 }
    );
  }, [statement]);

  const expenses = finance?.totalBills ?? 0;
  const profit = totals.net - expenses;

  const handleExportPdf = () => {
    if (!statement || statement.length === 0) {
      toast({ title: "Sem dados no período selecionado.", variant: "destructive" });
      return;
    }
    const doc = generateReportPdf({
      appName: settings.businessName || "BarberMetrics",
      title: "Relatório financeiro",
      startDate: range.start,
      endDate: range.end,
      includeClient: settings.reportIncludeClient,
      includeCommission: settings.reportIncludeCommission,
      rows: statement.map((s) => ({
        date: String(s.date),
        service: s.service,
        value: Number(s.value),
        commission: Number(s.barberEarnings),
      })),
      totals: {
        revenue: totals.gross,
        expenses,
        profit,
        workingMinutes: productivity?.totalWorkingMinutes,
      },
    });
    const fileName = `relatorio_${range.start}_${range.end}.pdf`;
    doc.save(fileName);
    toast({ title: "PDF gerado", description: fileName });
  };

  return (
    <MobileLayout title="Relatórios" subtitle="Período + exportação">
      <div className="p-4 pb-24 space-y-5">

        {/* Quick filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {QUICKS.map((q) => (
            <button
              key={q.key}
              onClick={() => setQuick(q.key)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-full transition-all border ${
                quick === q.key
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                  : "glass border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {quick === "custom" && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarRange className="w-3.5 h-3.5" /> Intervalo personalizado
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="date" value={custom.start}
                    max={custom.end}
                    onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="date" value={custom.end}
                    min={custom.start} max={fmtIso(new Date())}
                    onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Period banner */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Período</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {format(new Date(range.start + "T00:00:00"), "dd MMM", { locale: ptBR })}
                {" — "}
                {format(new Date(range.end + "T00:00:00"), "dd MMM yyyy", { locale: ptBR })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Atendimentos</div>
              <div className="text-2xl font-bold text-primary">{statement?.length ?? 0}</div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="icon-pill grad-green w-8 h-8 rounded-xl mb-2"><TrendingUp className="w-4 h-4" /></div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Receita</div>
              {loadingStmt ? <Skeleton className="h-5 w-16 mt-1" /> : (
                <div className="text-base font-bold text-emerald-400 truncate">{formatCurrency(totals.gross)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="icon-pill grad-rose w-8 h-8 rounded-xl mb-2"><TrendingDown className="w-4 h-4" /></div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Despesas</div>
              <div className="text-base font-bold text-rose-400 truncate">{formatCurrency(expenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="icon-pill grad-amber w-8 h-8 rounded-xl mb-2"><Wallet className="w-4 h-4" /></div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Lucro</div>
              <div className={`text-base font-bold truncate ${profit >= 0 ? "text-primary" : "text-rose-400"}`}>
                {formatCurrency(profit)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF action */}
        <Button
          size="lg"
          onClick={handleExportPdf}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20"
          disabled={loadingStmt || (statement?.length ?? 0) === 0}
        >
          <Download className="w-5 h-5 mr-2" /> Exportar PDF profissional
        </Button>

        {/* Detail list */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Detalhamento</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Líquido: <span className="text-foreground font-bold">{formatCurrency(totals.net)}</span>
              </span>
            </div>
            {loadingStmt ? (
              <div className="p-4 space-y-2">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : (statement?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum atendimento neste período.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[40vh] overflow-y-auto">
                {statement?.map((row) => (
                  <div key={row.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{row.service}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(new Date(String(row.date) + "T00:00:00"), "dd MMM", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{formatCurrency(Number(row.value))}</div>
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        +{formatCurrency(Number(row.barberEarnings))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
