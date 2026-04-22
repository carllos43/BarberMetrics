import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAppointments,
  useDeleteAppointment,
  useUpdateAppointment,
  useCreateAppointment,
  getListAppointmentsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetProductivityStatsQueryKey,
  getGetFinancialSummaryQueryKey,
  type ListAppointmentsParams,
  type Appointment,
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scissors, CalendarIcon, Clock, Trash2, Plus, Pencil, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Period = NonNullable<ListAppointmentsParams["period"]>;

const SERVICES = [
  { id: "corte", label: "Corte", value: 30, avgMin: 25 },
  { id: "corte_barba", label: "Corte + Barba", value: 50, avgMin: 40 },
  { id: "sobrancelha", label: "Sobrancelha", value: 10, avgMin: 15 },
  { id: "alisamento", label: "Alisamento", value: 80, avgMin: 60 },
];

function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function nowBRTime(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
}

function minutesAgoTime(minutes: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(Date.now() - minutes * 60000));
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcDuration(start: string, end: string): number {
  return Math.max(1, timeToMinutes(end) - timeToMinutes(start));
}

// ── Edit Drawer ─────────────────────────────────────────────────────────────
function EditDrawer({
  apt,
  open,
  onClose,
  onSaved,
}: {
  apt: Appointment | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [service, setService] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [value, setValue] = useState("");
  const { toast } = useToast();

  const handleOpen = useCallback(() => {
    if (apt) {
      setService(apt.service);
      setStartTime(apt.startTime.substring(0, 5));
      setEndTime(apt.endTime.substring(0, 5));
      setValue(apt.value.toString());
    }
  }, [apt]);

  const update = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Atendimento atualizado." });
        onSaved();
        onClose();
      },
      onError: () => toast({ title: "Erro ao atualizar.", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    if (!apt || !service || !startTime || !endTime || !value) return;
    update.mutate({
      id: apt.id,
      data: { service, startTime, endTime, value: parseFloat(value) },
    });
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); else handleOpen(); }}>
      <DrawerContent className="bg-card text-card-foreground border-border">
        <DrawerHeader>
          <DrawerTitle className="text-xl">Editar Atendimento</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pb-8 space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">Serviço</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {SERVICES.map(s => (
                <Button
                  key={s.id}
                  variant={service === s.label ? "default" : "outline"}
                  className="h-12 text-sm font-medium"
                  onClick={() => { setService(s.label); setValue(s.value.toString()); }}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Outro serviço..."
              className="bg-background border-border mt-1"
              value={SERVICES.some(s => s.label === service) ? "" : service}
              onChange={(e) => setService(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1.5 block">Início</Label>
              <Input
                type="time"
                className="bg-background border-border h-12 text-base"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Fim</Label>
              <Input
                type="time"
                className="bg-background border-border h-12 text-base"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {startTime && endTime && timeToMinutes(endTime) > timeToMinutes(startTime) && (
            <p className="text-xs text-muted-foreground text-center">
              Duração: {formatMinutes(calcDuration(startTime, endTime))}
            </p>
          )}
          <div>
            <Label className="text-sm mb-1.5 block">Valor (R$)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              className="bg-background border-border h-12 text-base"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button
            className="w-full h-12 font-bold text-base"
            onClick={handleSave}
            disabled={update.isPending || !service || !startTime || !endTime || !value}
          >
            {update.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Manual Add Drawer ────────────────────────────────────────────────────────
function ManualAddDrawer({
  open,
  onClose,
  onSaved,
  avgDuration,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  avgDuration: number;
}) {
  const [date, setDate] = useState(todayBR());
  const [service, setService] = useState("Corte");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState(nowBRTime());
  const [value, setValue] = useState("30");
  const { toast } = useToast();

  const create = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Atendimento registrado." });
        onSaved();
        onClose();
        // Reset form
        setDate(todayBR());
        setService("Corte");
        setStartTime("");
        setEndTime(nowBRTime());
        setValue("30");
      },
      onError: () => toast({ title: "Erro ao registrar.", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    const et = endTime || nowBRTime();
    const dur = avgDuration > 0 ? avgDuration : 25;
    const st = startTime || minutesAgoTime(calcDuration(startTime || minutesAgoTime(dur), et) || dur);
    const duration = calcDuration(st, et);
    create.mutate({
      data: {
        date,
        service,
        startTime: st,
        endTime: et,
        durationMinutes: duration,
        value: parseFloat(value),
      },
    });
  };

  const handleServiceSelect = (svc: typeof SERVICES[number]) => {
    setService(svc.label);
    setValue(svc.value.toString());
    const end = endTime || nowBRTime();
    const duration = avgDuration > 0 ? avgDuration : svc.avgMin;
    setStartTime(minutesAgoTime(duration));
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="bg-card text-card-foreground border-border">
        <DrawerHeader>
          <DrawerTitle className="text-xl">Registrar Atendimento</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pb-8 space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">Data</Label>
            <Input
              type="date"
              className="bg-background border-border h-12 text-base"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Serviço</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {SERVICES.map(s => (
                <Button
                  key={s.id}
                  variant={service === s.label ? "default" : "outline"}
                  className="h-12 text-sm font-medium"
                  onClick={() => handleServiceSelect(s)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1.5 block">Início</Label>
              <Input
                type="time"
                className="bg-background border-border h-12 text-base"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Fim</Label>
              <Input
                type="time"
                className="bg-background border-border h-12 text-base"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {startTime && endTime && timeToMinutes(endTime) > timeToMinutes(startTime) && (
            <p className="text-xs text-muted-foreground text-center">
              Duração: {formatMinutes(calcDuration(startTime, endTime))}
            </p>
          )}
          <div>
            <Label className="text-sm mb-1.5 block">Valor (R$)</Label>
            <Input
              type="number"
              inputMode="decimal"
              className="bg-background border-border h-12 text-base"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button
            className="w-full h-12 font-bold text-base"
            onClick={handleSave}
            disabled={create.isPending || !service || !value}
          >
            {create.isPending ? "Registrando..." : "Registrar Atendimento"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickRegisteredId, setQuickRegisteredId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointments, isLoading } = useListAppointments(
    { period },
    { query: { queryKey: getListAppointmentsQueryKey({ period }) } }
  );

  const avgDuration = appointments && appointments.length > 0
    ? Math.round(appointments.reduce((s, a) => s + a.durationMinutes, 0) / appointments.length)
    : 25;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ period }) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
  };

  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setDeletingId(null);
        setQuickRegisteredId(null);
        toast({ title: "Atendimento removido." });
      },
      onError: () => {
        toast({ title: "Erro ao remover.", variant: "destructive" });
        setDeletingId(null);
      },
    },
  });

  const quickRegister = useCreateAppointment({
    mutation: {
      onSuccess: (data) => {
        invalidateAll();
        setQuickRegisteredId(data.id);
        setShowQuickRegister(false);
        toast({ title: `${data.service} registrado! ${data.startTime.substring(0,5)} → ${data.endTime.substring(0,5)}` });
      },
      onError: () => toast({ title: "Erro ao registrar.", variant: "destructive" }),
    },
  });

  const handleQuickRegister = (svc: typeof SERVICES[number]) => {
    const endNow = nowBRTime();
    const duration = avgDuration > 0 ? avgDuration : svc.avgMin;
    const start = minutesAgoTime(duration);
    quickRegister.mutate({
      data: {
        date: todayBR(),
        service: svc.label,
        startTime: start,
        endTime: endNow,
        durationMinutes: duration,
        value: svc.value,
      },
    });
  };

  return (
    <MobileLayout title="Histórico">
      <div className="p-4 space-y-4 pb-8">

        {/* Header row */}
        <div className="flex justify-between items-center">
          <Select value={period} onValueChange={(val) => setPeriod(val as Period)}>
            <SelectTrigger className="w-[140px] bg-card border-border h-10 rounded-xl">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-muted-foreground bg-accent/50 px-3 py-1.5 rounded-full">
              {appointments?.length ?? 0} cortes
            </div>
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 rounded-xl border-border"
              onClick={() => setShowManualAdd(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick register section */}
        <div>
          <Button
            variant="outline"
            className="w-full h-10 border-dashed border-primary/40 text-primary text-sm font-medium rounded-xl flex items-center gap-2"
            onClick={() => setShowQuickRegister(v => !v)}
          >
            <Zap className="w-4 h-4" />
            {showQuickRegister ? "Fechar registro rápido" : "Registrar rápido"}
          </Button>

          <AnimatePresence>
            {showQuickRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SERVICES.map(s => (
                    <motion.div key={s.id} whileTap={{ scale: 0.96 }}>
                      <Button
                        variant="outline"
                        className="w-full h-16 flex flex-col items-center justify-center border-border hover:border-primary hover:text-primary transition-all"
                        onClick={() => handleQuickRegister(s)}
                        disabled={quickRegister.isPending}
                      >
                        <span className="font-semibold text-base">{s.label}</span>
                        <span className="text-xs text-muted-foreground opacity-80">R$ {s.value} · ~{s.avgMin}min</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
                <p className="text-[11px] text-center text-muted-foreground mt-2">
                  Registra com horário atual e tempo médio do dia ({avgDuration} min)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Last quick-registered undo banner */}
        <AnimatePresence>
          {quickRegisteredId !== null && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2"
            >
              <span className="text-sm text-primary font-medium">Atendimento registrado</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-primary"
                  onClick={() => { setEditingApt(appointments?.find(a => a.id === quickRegisteredId) ?? null); setQuickRegisteredId(null); }}
                >
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-destructive"
                  onClick={() => { setDeletingId(quickRegisteredId); }}
                >
                  Desfazer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Appointments list */}
        <div className="space-y-3">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : appointments?.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
                <Scissors className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">Nenhum atendimento</p>
              <p className="text-sm">Use o Timer ou o botão + para registrar.</p>
              <Button
                variant="outline"
                className="mt-4 border-primary/40 text-primary"
                onClick={() => setShowManualAdd(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Registrar agora
              </Button>
            </div>
          ) : (
            (() => {
              const today = todayBR();
              const yest = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d); })();
              const groups = new Map<string, typeof appointments>();
              appointments?.forEach(a => {
                const arr = groups.get(a.date) ?? [];
                arr.push(a);
                groups.set(a.date, arr);
              });
              const labelOf = (d: string) => {
                if (d === today) return "Hoje";
                if (d === yest) return "Ontem";
                try { return format(parseISO(d), "EEEE, dd 'de' MMM", { locale: ptBR }); }
                catch { return d; }
              };
              return Array.from(groups.entries()).map(([date, items]) => {
                const dayTotal = items?.reduce((s, a) => s + a.value, 0) ?? 0;
                const dayEarn = items?.reduce((s, a) => s + a.barberEarnings, 0) ?? 0;
                return (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center justify-between px-1 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{labelOf(date)}</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {items?.length} · <span className="text-foreground font-semibold">{formatCurrency(dayTotal)}</span>
                        {" · "}<span className="text-primary font-semibold">+{formatCurrency(dayEarn)}</span>
                      </span>
                    </div>
                    {items?.map((apt) => {
                      let aptDate: Date;
                      try { aptDate = parseISO(apt.date); } catch { aptDate = new Date(); }
                      return (
                <motion.div key={apt.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card border-border/40 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center p-4 gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground truncate">{apt.service}</h4>
                          <div className="flex items-center mt-0.5 text-xs text-muted-foreground gap-1">
                            <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                            <span>{format(aptDate, "dd MMM", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center mt-0.5 text-xs text-muted-foreground gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>
                              {apt.startTime.substring(0, 5)} → {apt.endTime.substring(0, 5)}
                              <span className="ml-1 opacity-60">({formatMinutes(apt.durationMinutes)})</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-sm text-foreground">{formatCurrency(apt.value)}</div>
                          <div className="text-xs font-medium text-primary mt-0.5">+{formatCurrency(apt.barberEarnings)}</div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => setEditingApt(apt)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(apt.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Edit Drawer */}
      <EditDrawer
        apt={editingApt}
        open={editingApt !== null}
        onClose={() => setEditingApt(null)}
        onSaved={invalidateAll}
      />

      {/* Manual Add Drawer */}
      <ManualAddDrawer
        open={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        onSaved={invalidateAll}
        avgDuration={avgDuration}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Este atendimento será removido permanentemente e os valores serão descontados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingId !== null) deleteAppointment({ id: deletingId }); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}
