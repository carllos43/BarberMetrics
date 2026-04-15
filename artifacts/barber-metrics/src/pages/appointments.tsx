import { useState } from "react";
import { useListAppointments, getListAppointmentsQueryKey, ListAppointmentsPeriod } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { formatCurrency, formatMinutes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scissors, CalendarIcon, Clock } from "lucide-react";

export default function AppointmentsPage() {
  const [period, setPeriod] = useState<ListAppointmentsPeriod>("today");
  
  const { data: appointments, isLoading } = useListAppointments(
    { period },
    { query: { queryKey: getListAppointmentsQueryKey({ period }) } }
  );

  return (
    <MobileLayout title="Histórico">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <Select value={period} onValueChange={(val) => setPeriod(val as ListAppointmentsPeriod)}>
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
            {appointments?.length || 0} cortes
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
              const aptDate = new Date(apt.date + "T" + apt.startTime);
              return (
                <Card key={apt.id} className="bg-card border-border/40 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center p-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4 text-primary">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-foreground truncate">{apt.service}</h4>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          <span className="mr-3">{format(aptDate, "dd MMM", { locale: ptBR })}</span>
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{apt.startTime.substring(0, 5)} ({formatMinutes(apt.durationMinutes)})</span>
                        </div>
                      </div>
                      <div className="text-right pl-2">
                        <div className="font-bold text-foreground">{formatCurrency(apt.value)}</div>
                        <div className="text-xs font-medium text-primary mt-0.5">
                          +{formatCurrency(apt.barberEarnings)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
