import { useState } from "react";
import { 
  useGetFinancialSummary,
  useListBills,
  useCreateBill,
  useDeleteBill,
  useGetCommission,
  useUpdateCommission,
  getGetFinancialSummaryQueryKey,
  getListBillsQueryKey,
  getGetCommissionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Plus, Wallet, TrendingDown, Target, CheckCircle2, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FinancesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [newBill, setNewBill] = useState({ name: "", value: "", dueDay: "" });
  const [commissionSlider, setCommissionSlider] = useState<number | null>(null);

  const { data: commission, isLoading: isLoadingCommission } = useGetCommission({
    query: { queryKey: getGetCommissionQueryKey() }
  });

  const updateCommission = useUpdateCommission({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetCommissionQueryKey() });
        setCommissionSlider(null);
        toast({ title: `Comissão atualizada para ${data.commissionPercent}%.` });
      },
      onError: () => toast({ title: "Erro ao salvar comissão.", variant: "destructive" }),
    }
  });

  const currentCommission = commissionSlider ?? commission?.commissionPercent ?? 60;

  const { data: summary, isLoading: isLoadingSummary } = useGetFinancialSummary({
    query: { queryKey: getGetFinancialSummaryQueryKey() }
  });

  const { data: bills, isLoading: isLoadingBills } = useListBills({
    query: { queryKey: getListBillsQueryKey() }
  });

  const createBill = useCreateBill({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
        setIsAddBillOpen(false);
        setNewBill({ name: "", value: "", dueDay: "" });
      }
    }
  });

  const deleteBill = useDeleteBill({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
      }
    }
  });

  const handleAddBill = () => {
    if (!newBill.name || !newBill.value || !newBill.dueDay) return;
    createBill.mutate({
      data: {
        name: newBill.name,
        value: parseFloat(newBill.value.replace(",", ".")),
        dueDay: parseInt(newBill.dueDay, 10),
        category: "Despesa Fixa"
      }
    });
  };

  const isNegative = summary && summary.remainingAfterBills < 0;

  return (
    <MobileLayout title="Finanças">
      <div className="p-4 space-y-6 pb-24">
        
        {/* Main Balance Card */}
        <Card className={`border-0 shadow-lg bg-gradient-to-br ${isNegative ? 'from-destructive/20 to-card' : 'from-primary/20 to-card'}`}>
          <CardContent className="p-6">
            <div className="flex items-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <Wallet className="w-4 h-4 mr-2" />
              Saldo Previsto (Fim do Mês)
            </div>
            {isLoadingSummary ? <Skeleton className="h-10 w-32" /> : (
              <div className="flex flex-col">
                <span className={`text-4xl font-bold tracking-tight ${isNegative ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(summary?.projectedAfterBills || 0)}
                </span>
                <span className="text-sm mt-2 text-foreground/80">
                  Baseado no ritmo atual ({summary?.daysRemainingInMonth || 0} dias restantes)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current status */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Caixa Atual</div>
              {isLoadingSummary ? <Skeleton className="h-6 w-20" /> : (
                <div className="text-xl font-bold text-foreground">{formatCurrency(summary?.currentMonthEarnings || 0)}</div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Despesas Fixas</div>
              {isLoadingSummary ? <Skeleton className="h-6 w-20" /> : (
                <div className="text-xl font-bold text-destructive">{formatCurrency(summary?.totalBills || 0)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Goals Progress */}
        <Card className="bg-card border-border/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-muted-foreground uppercase tracking-wider">
              <Target className="w-4 h-4 mr-2" />
              Progresso do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {isLoadingSummary ? <Skeleton className="h-12 w-full" /> : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">Pagar Custos</span>
                    <span className="font-bold">{formatCurrency(summary?.currentMonthEarnings || 0)} / {formatCurrency(summary?.totalBills || 0)}</span>
                  </div>
                  <Progress 
                    value={Math.min(100, ((summary?.currentMonthEarnings || 0) / (summary?.totalBills || 1)) * 100)} 
                    className="h-2.5 bg-accent"
                  />
                  {(summary?.billsShortfall || 0) > 0 && (
                    <div className="text-xs text-amber-500 font-medium mt-1.5 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Faltam {formatCurrency(summary?.billsShortfall || 0)} para cobrir custos
                    </div>
                  )}
                  {(summary?.billsShortfall || 0) <= 0 && summary && summary.totalBills > 0 && (
                    <div className="text-xs text-primary font-medium mt-1.5 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Custos do mês garantidos!
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Setting */}
        <Card className="bg-card border-border/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-muted-foreground uppercase tracking-wider">
              <Percent className="w-4 h-4 mr-2" />
              Minha Comissão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {isLoadingCommission ? <Skeleton className="h-12 w-full" /> : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Porcentagem sobre cada serviço</span>
                  <span className="text-2xl font-bold text-primary">{currentCommission}%</span>
                </div>
                <Slider
                  min={10}
                  max={100}
                  step={1}
                  value={[currentCommission]}
                  onValueChange={([v]) => setCommissionSlider(v)}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>10%</span>
                  <span>Exemplo: R$50 → <span className="font-semibold text-foreground">+{formatCurrency(50 * currentCommission / 100)}</span> pra você</span>
                  <span>100%</span>
                </div>
                {commissionSlider !== null && commissionSlider !== commission?.commissionPercent && (
                  <Button
                    className="w-full h-10 font-bold"
                    onClick={() => updateCommission.mutate({ data: { commissionPercent: currentCommission } })}
                    disabled={updateCommission.isPending}
                  >
                    {updateCommission.isPending ? "Salvando..." : "Salvar Comissão"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bills List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-lg">Suas Despesas</h3>
            <Dialog open={isAddBillOpen} onOpenChange={setIsAddBillOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 rounded-full px-4 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border-0">
                  <Plus className="w-4 h-4 mr-1" /> Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90%] rounded-2xl bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Adicionar Despesa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conta</Label>
                    <Input 
                      id="name" 
                      placeholder="Ex: Aluguel cadeira, Internet..."
                      value={newBill.name}
                      onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="value">Valor (R$)</Label>
                      <Input 
                        id="value" 
                        type="number"
                        placeholder="0,00"
                        value={newBill.value}
                        onChange={(e) => setNewBill({ ...newBill, value: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDay">Dia Vencimento</Label>
                      <Input 
                        id="dueDay" 
                        type="number"
                        min="1"
                        max="31"
                        placeholder="10"
                        value={newBill.dueDay}
                        onChange={(e) => setNewBill({ ...newBill, dueDay: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                  </div>
                  <Button className="w-full h-12 font-bold text-base mt-2" onClick={handleAddBill} disabled={createBill.isPending}>
                    Salvar Despesa
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingBills ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : bills?.length === 0 ? (
            <Card className="bg-transparent border-dashed border-border">
              <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center">
                <p className="text-sm">Nenhuma despesa fixa cadastrada.</p>
                <p className="text-xs mt-1">Adicione para o BarberMetrics calcular sua meta diária real.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bills?.map((bill) => (
                <Card key={bill.id} className="bg-card border-border/40 shadow-sm">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{bill.name}</h4>
                      <p className="text-xs text-muted-foreground">Vence dia {bill.dueDay}</p>
                    </div>
                    <div className="flex items-center">
                      <div className="font-bold text-foreground mr-4 text-sm">{formatCurrency(bill.value)}</div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteBill.mutate({ id: bill.id })}
                        disabled={deleteBill.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
