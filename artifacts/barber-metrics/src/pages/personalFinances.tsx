import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PiggyBank, Plus, Trash2, AlertTriangle, CheckCircle2, Calendar,
  Download, Banknote, Wallet, Sparkles, Lock, ArrowDownCircle,
  TrendingUp, Coffee, ShoppingBag, Pencil,
} from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pf, type CategoriaDestino, type PersonalAlert, type CategoryWithBalance, type PersonalBill } from "@/lib/personalFinances";
import { generatePersonalFinancesPdf } from "@/lib/personalPdf";
import { generatePersonalReportPdf } from "@/lib/personalReportPdf";
import { getSession } from "@/lib/auth";
import { CategoryExtractDrawer } from "@/components/personal/CategoryExtractDrawer";
import { FileText, Receipt } from "lucide-react";
import { format as formatFn } from "date-fns";

const categoriaLabel: Record<CategoriaDestino, string> = {
  gasto_livre: "Gasto livre",
  conta_fixa: "Conta fixa",
  reserva: "Reserva",
};
const categoriaIcon: Record<CategoriaDestino, React.ElementType> = {
  gasto_livre: Coffee,
  conta_fixa: Banknote,
  reserva: PiggyBank,
};

function alertColor(s: PersonalAlert["severity"]) {
  if (s === "danger") return "bg-destructive/15 border-destructive/30 text-destructive";
  if (s === "warn") return "bg-amber-500/15 border-amber-500/30 text-amber-300";
  return "bg-primary/15 border-primary/30 text-primary";
}

function billLight(diaVencimento: number): { color: string; label: string; days: number } {
  const today = new Date();
  const dia = today.getUTCDate();
  const days = ((diaVencimento - dia) + 31) % 31;
  if (days <= 1) return { color: "bg-destructive", label: days === 0 ? "Vence hoje" : "Vence amanhã", days };
  if (days <= 5) return { color: "bg-amber-400", label: `Vence em ${days}d`, days };
  return { color: "bg-emerald-400", label: `Vence em ${days}d`, days };
}

export default function PersonalFinancesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const session = getSession();

  const overviewQ = useQuery({ queryKey: ["pf", "overview"], queryFn: pf.overview });
  const cyclesQ   = useQuery({ queryKey: ["pf", "cycles"], queryFn: () => pf.cycles(12) });
  const cardsQ    = useQuery({ queryKey: ["pf", "cards"], queryFn: pf.cards });

  const [openCard, setOpenCard] = useState<CategoryWithBalance | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PersonalBill | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", description: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const today = new Date();
  const monthStart = formatFn(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
  const monthEnd = formatFn(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");
  const [reportForm, setReportForm] = useState({ start: monthStart, end: monthEnd });
  const [reportLoading, setReportLoading] = useState(false);

  const [valeOpen, setValeOpen] = useState(false);
  const [valeForm, setValeForm] = useState<{ valor: string; categoriaDestino: CategoriaDestino; descricao: string }>({
    valor: "", categoriaDestino: "gasto_livre", descricao: "",
  });
  const [billOpen, setBillOpen] = useState(false);
  const [billForm, setBillForm] = useState({ nome: "", valor: "", diaVencimento: "" });
  const [envOpen, setEnvOpen] = useState(false);
  const [envForm, setEnvForm] = useState({
    saldoBanco: "", saldoGuardado: "", percentualCaixinha: 30,
    limiteLazer: "", limiteComida: "", limiteOutros: "",
  });

  useEffect(() => {
    if (envOpen && overviewQ.data) {
      const p = overviewQ.data.pessoal;
      setEnvForm({
        saldoBanco: String(p.saldoBanco),
        saldoGuardado: String(p.saldoGuardado),
        percentualCaixinha: p.percentualCaixinha,
        limiteLazer: String(p.limiteLazer),
        limiteComida: String(p.limiteComida),
        limiteOutros: String(p.limiteOutros),
      });
    }
  }, [envOpen, overviewQ.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pf"] });
  };

  const createVale = useMutation({
    mutationFn: () => pf.createWithdrawal({
      valor: parseFloat(valeForm.valor.replace(",", ".")),
      categoriaDestino: valeForm.categoriaDestino,
      descricao: valeForm.descricao || undefined,
    }),
    onSuccess: (w) => {
      invalidate();
      setValeOpen(false);
      setValeForm({ valor: "", categoriaDestino: "gasto_livre", descricao: "" });
      if (w.isExcedente) {
        toast({
          title: "Vale acima do disponível",
          description: "Esse valor entrou como excedente da semana.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Vale registrado." });
      }
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteVale = useMutation({
    mutationFn: (id: number) => pf.deleteWithdrawal(id),
    onSuccess: () => { invalidate(); toast({ title: "Vale removido." }); },
  });

  const createBill = useMutation({
    mutationFn: () => pf.bills.create({
      nome: billForm.nome,
      valor: parseFloat(billForm.valor.replace(",", ".")),
      diaVencimento: parseInt(billForm.diaVencimento, 10),
    }),
    onSuccess: () => {
      invalidate();
      setBillOpen(false);
      setBillForm({ nome: "", valor: "", diaVencimento: "" });
      toast({ title: "Conta cadastrada." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleBill = useMutation({
    mutationFn: (b: { id: number; ativa: boolean }) => pf.bills.update(b.id, { ativa: b.ativa }),
    onSuccess: invalidate,
  });
  const removeBill = useMutation({
    mutationFn: (id: number) => pf.bills.remove(id),
    onSuccess: invalidate,
  });

  const saveSettings = useMutation({
    mutationFn: () => pf.updateSettings({
      saldoBanco: parseFloat(envForm.saldoBanco.replace(",", ".")) || 0,
      saldoGuardado: parseFloat(envForm.saldoGuardado.replace(",", ".")) || 0,
      percentualCaixinha: envForm.percentualCaixinha,
      limiteLazer: parseFloat(envForm.limiteLazer.replace(",", ".")) || 0,
      limiteComida: parseFloat(envForm.limiteComida.replace(",", ".")) || 0,
      limiteOutros: parseFloat(envForm.limiteOutros.replace(",", ".")) || 0,
    }),
    onSuccess: () => { invalidate(); setEnvOpen(false); toast({ title: "Envelopes atualizados." }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const closeWeek = useMutation({
    mutationFn: () => pf.closeWeek(overviewQ.data!.semana.cycleId),
    onSuccess: (r) => {
      invalidate();
      toast({
        title: "Semana fechada!",
        description: `Banco: ${formatCurrency(r.saldoBanco)} • Reserva: ${formatCurrency(r.saldoGuardado)}`,
      });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const exportPdf = () => {
    if (!overviewQ.data) return;
    const doc = generatePersonalFinancesPdf({
      appName: "BarberMetrics",
      ownerName: session?.user.fullName ?? "Profissional",
      overview: overviewQ.data,
      cycles: cyclesQ.data ?? [],
    });
    doc.save(`financeiro-pessoal-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const payBillMut = useMutation({
    mutationFn: () => pf.payBill({
      billId: payTarget!.id,
      amount: parseFloat(payForm.amount.replace(",", ".")),
      description: payForm.description || payTarget!.nome,
    }),
    onSuccess: () => {
      invalidate();
      setPayOpen(false);
      setPayTarget(null);
      setPayForm({ amount: "", description: "" });
      toast({ title: "Pagamento registrado." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handlePayClick = (bill: PersonalBill) => {
    setPayTarget(bill);
    setPayForm({ amount: String(bill.valor), description: bill.nome });
    setPayOpen(true);
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const data = await pf.report(reportForm.start, reportForm.end);
      const doc = generatePersonalReportPdf({
        appName: "BarberMetrics",
        ownerName: session?.user.fullName ?? "Profissional",
        report: data,
      });
      doc.save(`relatorio-${reportForm.start}_${reportForm.end}.pdf`);
      setReportOpen(false);
      toast({ title: "Relatório gerado." });
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const overview = overviewQ.data;
  const isNeg = (overview?.semana.saldoDisponivel ?? 0) < 0;

  // limite diário usado vs sugerido (estimativa simples: vales / dias passados)
  const limitePct = useMemo(() => {
    if (!overview) return 0;
    const total = overview.semana.produzido;
    if (total <= 0) return 0;
    return Math.min(100, (overview.semana.vales / total) * 100);
  }, [overview]);

  return (
    <MobileLayout
      title="Financeiro Pessoal"
      subtitle={overview ? `Semana ${format(parseISO(overview.semana.startDate), "dd/MM")} → ${format(parseISO(overview.semana.endDate), "dd/MM")}` : undefined}
      rightSlot={
        <button
          onClick={exportPdf}
          aria-label="Exportar PDF"
          disabled={!overview}
          className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
        </button>
      }
    >
      <div className="p-4 space-y-5 pb-28">
        {/* HERO */}
        {overviewQ.isLoading || !overview ? (
          <Skeleton className="h-44 w-full rounded-3xl" />
        ) : (
          <Card className={cn(
            "border-0 shadow-2xl rounded-3xl overflow-hidden",
            "bg-gradient-to-br",
            isNeg ? "from-destructive/30 via-destructive/10 to-card" : "from-primary/30 via-primary/10 to-card",
          )}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Disponível esta semana
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  overview.semana.status === "open" ? "bg-emerald-500/20 text-emerald-300" : "bg-muted/40 text-muted-foreground",
                )}>
                  {overview.semana.status === "open" ? "Aberta" : "Fechada"}
                </div>
              </div>
              <div className={cn(
                "text-5xl font-black tracking-tight tabular-nums",
                isNeg ? "text-destructive" : "text-foreground",
              )}>
                {formatCurrency(overview.semana.saldoDisponivel)}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Produzido</div>
                  <div className="text-sm font-bold text-foreground">{formatCurrency(overview.semana.produzido)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Vales</div>
                  <div className="text-sm font-bold text-amber-300">- {formatCurrency(overview.semana.vales)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Limite/dia</div>
                  <div className="text-sm font-bold text-primary">{formatCurrency(overview.semana.limiteDiarioSugerido)}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Já consumido</span>
                  <span>{limitePct.toFixed(0)}%</span>
                </div>
                <Progress value={limitePct} className="h-2 bg-background/40" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 h-11 rounded-xl font-bold"
                  onClick={() => setValeOpen(true)}
                  disabled={overview.semana.status === "closed"}
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" /> Vale
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 h-11 rounded-xl font-bold"
                  onClick={() => closeWeek.mutate()}
                  disabled={overview.semana.status === "closed" || closeWeek.isPending}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {closeWeek.isPending ? "Fechando..." : "Fechar semana"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ALERTS */}
        {overview && overview.alerts.length > 0 && (
          <div className="space-y-2">
            {overview.alerts.map((a, i) => (
              <div
                key={i}
                className={cn("rounded-2xl border p-3 flex items-start gap-3 text-sm", alertColor(a.severity))}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* ENVELOPES — agora cards clicáveis com saldo em tempo real */}
        {overview && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cards</h3>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEnvOpen(true)}>
                <Pencil className="w-3 h-3 mr-1" /> Ajustar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(cardsQ.data ?? []).map((c) => (
                <EnvelopeCard
                  key={c.id}
                  icon={iconBySlug(c.slug)}
                  label={c.nome}
                  value={c.saldo}
                  tone={toneBySlug(c.slug)}
                  hint={c.slug === "reserva" ? `${overview.pessoal.percentualCaixinha}% no fechamento` : undefined}
                  small={["lazer", "comida", "outros"].includes(c.slug)}
                  onClick={() => setOpenCard(c)}
                />
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5 px-1">
              Toque em qualquer card pra ver o extrato detalhado.
            </div>
          </div>
        )}

        {/* CONTAS - SEMÁFORO */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Contas pessoais</h3>
            <Button
              size="sm" variant="secondary"
              className="h-8 rounded-full px-3 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border-0"
              onClick={() => setBillOpen(true)}
            >
              <Plus className="w-3 h-3 mr-1" /> Nova
            </Button>
          </div>
          {overviewQ.isLoading ? (
            <Skeleton className="h-20 w-full rounded-2xl" />
          ) : overview && overview.contas.length === 0 ? (
            <Card className="bg-transparent border-dashed border-border/60 rounded-2xl">
              <CardContent className="p-5 text-center text-muted-foreground text-sm">
                Cadastre suas contas pessoais (aluguel, internet, faculdade) e veja o semáforo de vencimento.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {overview!.contas.map((c) => {
                const light = billLight(c.diaVencimento);
                return (
                  <Card key={c.id} className="bg-card border-border/40 rounded-2xl">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn("w-2.5 h-12 rounded-full", c.ativa ? light.color : "bg-muted")} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{c.nome}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> {c.ativa ? light.label : "Pausada"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm tabular-nums">{formatCurrency(c.valor)}</div>
                        <div className="text-[10px] text-muted-foreground">dia {c.diaVencimento}</div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-3 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-0"
                          onClick={() => handlePayClick(c)}
                          disabled={!c.ativa}
                        >
                          Pagar
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={c.ativa}
                            onCheckedChange={(v) => toggleBill.mutate({ id: c.id, ativa: v })}
                          />
                          <button
                            onClick={() => removeBill.mutate(c.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* RELATÓRIO */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Gerar Relatório</h3>
          </div>
          <Card className="bg-card/60 border-border/40 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Relatório financeiro pessoal</div>
                <div className="text-[11px] text-muted-foreground">
                  PDF detalhado com produzido, vales e contas pagas no período.
                </div>
              </div>
              <Button
                size="sm"
                className="h-9 rounded-xl font-bold"
                onClick={() => setReportOpen(true)}
              >
                Escolher período
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* HISTÓRICO DE SEMANAS */}
        {cyclesQ.data && cyclesQ.data.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Histórico</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> últimas {cyclesQ.data.length}
              </span>
            </div>
            <div className="space-y-2">
              {cyclesQ.data.map((c) => (
                <Card key={c.id} className="bg-card/60 border-border/30 rounded-2xl">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      c.status === "closed" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-400",
                    )}>
                      {c.status === "closed" ? <CheckCircle2 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">
                        {format(parseISO(c.startDate), "dd/MM", { locale: ptBR })} → {format(parseISO(c.endDate), "dd/MM", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vales {formatCurrency(c.totalVales)} • Produzido {formatCurrency(c.saldoProduzido)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-sm font-bold tabular-nums",
                        (c.saldoFinal ?? 0) < 0 ? "text-destructive" : "text-primary",
                      )}>
                        {c.saldoFinal != null ? formatCurrency(c.saldoFinal) : "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL VALE */}
      <Dialog open={valeOpen} onOpenChange={setValeOpen}>
        <DialogContent className="max-w-[92%] rounded-3xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Registrar vale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                inputMode="decimal" placeholder="0,00"
                value={valeForm.valor}
                onChange={(e) => setValeForm({ ...valeForm, valor: e.target.value })}
                className="h-12 text-lg font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select
                value={valeForm.categoriaDestino}
                onValueChange={(v) => setValeForm({ ...valeForm, categoriaDestino: v as CategoriaDestino })}
              >
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoriaLabel) as CategoriaDestino[]).map((c) => {
                    const Icon = categoriaIcon[c];
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {categoriaLabel[c]}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Almoço, gasolina, mercado..."
                value={valeForm.descricao}
                onChange={(e) => setValeForm({ ...valeForm, descricao: e.target.value })}
              />
            </div>
            <Button
              className="w-full h-12 font-bold text-base mt-2"
              onClick={() => createVale.mutate()}
              disabled={!valeForm.valor || createVale.isPending}
            >
              {createVale.isPending ? "Salvando..." : "Confirmar vale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CONTA */}
      <Dialog open={billOpen} onOpenChange={setBillOpen}>
        <DialogContent className="max-w-[92%] rounded-3xl bg-card border-border">
          <DialogHeader><DialogTitle>Nova conta pessoal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Aluguel, internet, faculdade..."
                value={billForm.nome}
                onChange={(e) => setBillForm({ ...billForm, nome: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  inputMode="decimal" placeholder="0,00"
                  value={billForm.valor}
                  onChange={(e) => setBillForm({ ...billForm, valor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia venc.</Label>
                <Input
                  inputMode="numeric" min={1} max={31} placeholder="10"
                  value={billForm.diaVencimento}
                  onChange={(e) => setBillForm({ ...billForm, diaVencimento: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full h-12 font-bold mt-2"
              onClick={() => createBill.mutate()}
              disabled={!billForm.nome || !billForm.valor || !billForm.diaVencimento || createBill.isPending}
            >
              {createBill.isPending ? "Salvando..." : "Salvar conta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL ENVELOPES */}
      <Dialog open={envOpen} onOpenChange={setEnvOpen}>
        <DialogContent className="max-w-[92%] rounded-3xl bg-card border-border">
          <DialogHeader><DialogTitle>Ajustar envelopes</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Banco (R$)</Label>
                <Input inputMode="decimal" value={envForm.saldoBanco}
                  onChange={(e) => setEnvForm({ ...envForm, saldoBanco: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reserva (R$)</Label>
                <Input inputMode="decimal" value={envForm.saldoGuardado}
                  onChange={(e) => setEnvForm({ ...envForm, saldoGuardado: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>% que vai pra reserva no fechamento</Label>
                <span className="font-bold text-primary">{envForm.percentualCaixinha}%</span>
              </div>
              <Slider
                min={0} max={100} step={5} value={[envForm.percentualCaixinha]}
                onValueChange={([v]) => setEnvForm({ ...envForm, percentualCaixinha: v })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Lazer</Label>
                <Input inputMode="decimal" value={envForm.limiteLazer}
                  onChange={(e) => setEnvForm({ ...envForm, limiteLazer: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comida</Label>
                <Input inputMode="decimal" value={envForm.limiteComida}
                  onChange={(e) => setEnvForm({ ...envForm, limiteComida: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Outros</Label>
                <Input inputMode="decimal" value={envForm.limiteOutros}
                  onChange={(e) => setEnvForm({ ...envForm, limiteOutros: e.target.value })} />
              </div>
            </div>
            <Button
              className="w-full h-12 font-bold mt-2"
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending}
            >
              {saveSettings.isPending ? "Salvando..." : "Salvar envelopes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PAGAR CONTA */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {payTarget && (
              <div className="text-sm text-muted-foreground">
                {payTarget.nome} • vence dia {payTarget.diaVencimento}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Valor pago (R$)</Label>
              <Input
                inputMode="decimal"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input
                value={payForm.description}
                onChange={(e) => setPayForm({ ...payForm, description: e.target.value })}
                className="h-11"
              />
            </div>
            <Button
              className="w-full h-11 font-bold"
              onClick={() => payBillMut.mutate()}
              disabled={!payForm.amount || payBillMut.isPending}
            >
              {payBillMut.isPending ? "Registrando..." : "Confirmar pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL RELATÓRIO */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Período do relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">De</Label>
                <Input
                  type="date"
                  value={reportForm.start}
                  onChange={(e) => setReportForm({ ...reportForm, start: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Até</Label>
                <Input
                  type="date"
                  value={reportForm.end}
                  onChange={(e) => setReportForm({ ...reportForm, end: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <Button
              className="w-full h-11 font-bold"
              onClick={generateReport}
              disabled={reportLoading || !reportForm.start || !reportForm.end}
            >
              {reportLoading ? "Gerando PDF..." : "Baixar PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DRAWER DE EXTRATO */}
      <CategoryExtractDrawer
        open={!!openCard}
        onClose={() => setOpenCard(null)}
        category={openCard ? (cardsQ.data?.find((c) => c.id === openCard.id) ?? openCard) : null}
      />
    </MobileLayout>
  );
}

function EnvelopeCard({
  icon, label, value, tone, hint, small, onClick,
}: { icon: React.ReactNode; label: string; value: number; tone: string; hint?: string; small?: boolean; onClick?: () => void }) {
  const inner = (
    <Card className={cn(
      "border-0 rounded-2xl bg-gradient-to-br transition-transform",
      tone,
      onClick && "active:scale-[0.97] hover:shadow-lg cursor-pointer",
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider">
          {icon} {label}
        </div>
        <div className={cn("font-bold tabular-nums mt-1", small ? "text-base" : "text-lg",
          value < 0 ? "text-destructive" : "")}>
          {formatCurrency(value)}
        </div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left w-full" aria-label={`Abrir extrato ${label}`}>
        {inner}
      </button>
    );
  }
  return inner;
}

function iconBySlug(slug: string): React.ReactNode {
  switch (slug) {
    case "banco":   return <Banknote className="w-4 h-4" />;
    case "reserva": return <PiggyBank className="w-4 h-4" />;
    case "lazer":   return <Coffee className="w-4 h-4" />;
    case "comida":  return <ShoppingBag className="w-4 h-4" />;
    case "contas":  return <Receipt className="w-4 h-4" />;
    default:        return <Wallet className="w-4 h-4" />;
  }
}
function toneBySlug(slug: string): string {
  switch (slug) {
    case "banco":   return "from-emerald-500/20 to-card";
    case "reserva": return "from-violet-500/20 to-card";
    case "lazer":   return "from-amber-500/15 to-card";
    case "comida":  return "from-pink-500/15 to-card";
    case "contas":  return "from-rose-500/20 to-card";
    default:        return "from-slate-500/15 to-card";
  }
}
