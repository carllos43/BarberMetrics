import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAppointments,
  useDeleteAppointment,
  getListAppointmentsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetProductivityStatsQueryKey,
  getGetFinancialSummaryQueryKey,
  type ListAppointmentsParams,
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scissors, CalendarIcon, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Period = NonNullable<ListAppointmentsParams["period"]>;

export default function AppointmentsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointments, isLoading } = useListAppointments(
    { period },
    { query: { queryKey: getListAppointmentsQueryKey({ period }) } }
  );

  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ period }) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
        setDeletingId(null);
        toast({ title: "Atendimento removido com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro ao remover atendimento.", variant: "destructive" });
        setDeletingId(null);
      },
    },
  });

  const handleDeleteConfirm = () => {
    if (deletingId !== null) {
      deleteAppointment({ id: deletingId });
    }
  };

  return (
    <MobileLayout title="Histórico">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
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
          <div className="text-sm font-medium text-muted-foreground bg-accent/50 px-3 py-1.5 rounded-full">
            {appointments?.length ?? 0} cortes
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : appointments?.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-4">
                <Scissors className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">Nenhum atendimento</p>
              <p className="text-sm">Nenhum corte registrado neste período.</p>
            </div>
          ) : (
            appointments?.map((apt) => {
              let aptDate: Date;
              try {
                aptDate = parseISO(apt.date);
              } catch {
                aptDate = new Date();
              }

              return (
                <Card key={apt.id} className="bg-card border-border/40 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center p-4 gap-3">
                      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-foreground truncate">{apt.service}</h4>
                        <div className="flex items-center mt-0.5 text-xs text-muted-foreground gap-1">
                          <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                          <span>{format(aptDate, "dd MMM", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center mt-0.5 text-xs text-muted-foreground gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {apt.startTime.substring(0, 5)} → {apt.endTime.substring(0, 5)}
                            <span className="ml-1 text-muted-foreground/70">({formatMinutes(apt.durationMinutes)})</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">{formatCurrency(apt.value)}</div>
                        <div className="text-xs font-medium text-primary mt-0.5">
                          +{formatCurrency(apt.barberEarnings)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-9 h-9"
                        onClick={() => setDeletingId(apt.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Este atendimento será removido permanentemente do histórico e os valores serão descontados do faturamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
