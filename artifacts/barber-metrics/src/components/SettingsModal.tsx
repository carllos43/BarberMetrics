import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCommission, useUpdateCommission, getGetCommissionQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings, type ChartGrouping, type AppSettings } from "@/lib/settings";
import { logout, getSession } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { LogOut, RotateCcw } from "lucide-react";

export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { settings, update, reset } = useSettings();
  const session = getSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: commission } = useGetCommission({
    query: { queryKey: getGetCommissionQueryKey(), enabled: open },
  });
  const updateCommission = useUpdateCommission({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCommissionQueryKey() });
        toast({ title: "Comissão atualizada." });
      },
    },
  });

  const [commissionDraft, setCommissionDraft] = useState<number | null>(null);
  const currentCommission = commissionDraft ?? commission?.commissionPercent ?? 60;
  const commissionDirty = commissionDraft !== null && commissionDraft !== commission?.commissionPercent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] max-h-[88vh] overflow-y-auto rounded-2xl glass-strong border-0">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Personalize como o BarberMetrics se comporta.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="global" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="global">Geral</TabsTrigger>
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="finance">Finanças</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Nome do negócio</Label>
              <Input
                value={settings.businessName}
                onChange={(e) => update({ businessName: e.target.value })}
                placeholder={session?.barbershop.name ?? "Sua barbearia"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Comissão padrão sobre cada serviço</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quanto fica com você</span>
                <span className="text-2xl font-bold text-primary">{currentCommission}%</span>
              </div>
              <Slider
                min={10} max={100} step={1}
                value={[currentCommission]}
                onValueChange={([v]) => setCommissionDraft(v)}
              />
              {commissionDirty && (
                <Button
                  className="w-full"
                  onClick={() => updateCommission.mutate({ data: { commissionPercent: currentCommission } })}
                  disabled={updateCommission.isPending}
                >
                  {updateCommission.isPending ? "Salvando..." : "Salvar comissão"}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Moeda</Label>
                <Input value="BRL (R$)" disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Formato de data</Label>
                <Select
                  value={settings.dateFormat}
                  onValueChange={(v) => update({ dateFormat: v as AppSettings["dateFormat"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">31/12/2026</SelectItem>
                    <SelectItem value="yyyy-MM-dd">2026-12-31</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timer" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Valor da sua hora ideal (R$)</Label>
              <Input
                type="number" inputMode="decimal" placeholder="0,00"
                value={settings.hourlyRate || ""}
                onChange={(e) => update({ hourlyRate: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Usado como referência nas métricas.</p>
            </div>
            <div className="flex items-center justify-between rounded-xl glass p-3">
              <div>
                <Label className="text-sm font-medium">Modo manual</Label>
                <p className="text-xs text-muted-foreground">Permite registrar atendimentos sem usar o timer</p>
              </div>
              <Switch
                checked={settings.timerMode === "manual"}
                onCheckedChange={(c) => update({ timerMode: c ? "manual" : "auto" })}
              />
            </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Categorias de despesa</Label>
              <div className="flex flex-wrap gap-2">
                {settings.expenseCategories.map((c) => (
                  <span key={c} className="text-xs px-3 py-1.5 rounded-full glass">{c}</span>
                ))}
              </div>
              <Input
                placeholder="Adicionar categoria + Enter"
                onKeyDown={(e) => {
                  const t = (e.target as HTMLInputElement);
                  if (e.key === "Enter" && t.value.trim()) {
                    update({ expenseCategories: [...settings.expenseCategories, t.value.trim()] });
                    t.value = "";
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl glass p-3">
              <div>
                <Label className="text-sm font-medium">Incluir comissão no caixa</Label>
                <p className="text-xs text-muted-foreground">Considera o seu ganho como receita</p>
              </div>
              <Switch
                checked={settings.includeCommissionInFinance}
                onCheckedChange={(c) => update({ includeCommissionInFinance: c })}
              />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Agrupamento dos gráficos</Label>
              <Select
                value={settings.chartGrouping}
                onValueChange={(v) => update({ chartGrouping: v as ChartGrouping })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl glass p-3">
              <div>
                <Label className="text-sm font-medium">Incluir cliente no PDF</Label>
                <p className="text-xs text-muted-foreground">Adiciona coluna do cliente no relatório</p>
              </div>
              <Switch
                checked={settings.reportIncludeClient}
                onCheckedChange={(c) => update({ reportIncludeClient: c })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl glass p-3">
              <div>
                <Label className="text-sm font-medium">Incluir comissão no PDF</Label>
                <p className="text-xs text-muted-foreground">Mostra coluna de comissão por serviço</p>
              </div>
              <Switch
                checked={settings.reportIncludeCommission}
                onCheckedChange={(c) => update({ reportIncludeCommission: c })}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t border-border/40 mt-2">
          <Button variant="outline" className="flex-1" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Resetar
          </Button>
          <Button variant="destructive" className="flex-1" onClick={() => { logout(); onOpenChange(false); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

