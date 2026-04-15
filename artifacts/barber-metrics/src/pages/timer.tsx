import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useStartTimer, 
  useGetActiveTimer, 
  useFinishTimer,
  getGetActiveTimerQueryKey,
  getGetDashboardSummaryQueryKey,
  getListAppointmentsQueryKey,
  getGetProductivityStatsQueryKey,
  getGetFinancialSummaryQueryKey
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, AlertTriangle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const SERVICES = [
  { id: "corte", label: "Corte", value: 30 },
  { id: "corte_barba", label: "Corte + Barba", value: 50 },
  { id: "sobrancelha", label: "Sobrancelha", value: 10 },
  { id: "alisamento", label: "Alisamento", value: 80 },
];

export default function TimerPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [showServices, setShowServices] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const { data: activeTimer, isLoading: isLoadingTimer } = useGetActiveTimer({
    query: { 
      queryKey: getGetActiveTimerQueryKey(),
      refetchInterval: 1000 
    }
  });

  const startTimer = useStartTimer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveTimerQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const finishTimer = useFinishTimer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActiveTimerQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
        setShowServices(false);
        setLocation("/");
      }
    }
  });

  useEffect(() => {
    if (activeTimer?.isActive) {
      setElapsed(activeTimer.elapsedSeconds);
      const interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTimer?.isActive, activeTimer?.elapsedSeconds]);

  const handleStart = () => {
    startTimer.mutate();
  };

  const handleStop = () => {
    setShowServices(true);
  };

  const handleServiceSelect = (serviceLabel: string, value: number) => {
    finishTimer.mutate({ data: { service: serviceLabel, value } });
  };

  const handleCustomService = () => {
    const val = parseFloat(customValue.replace(",", "."));
    if (!isNaN(val) && val > 0) {
      finishTimer.mutate({ data: { service: "Outro", value: val, customService: "Outro Serviço" } });
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const minutes = Math.floor(elapsed / 60);
  const isWarning = minutes >= 20 && minutes < 25;
  const isDanger = minutes >= 25;

  return (
    <MobileLayout title="Timer" hideNav={activeTimer?.isActive}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        
        {isLoadingTimer ? (
          <Skeleton className="w-64 h-24 rounded-2xl mb-12" />
        ) : (
          <motion.div 
            className="mb-12 relative flex flex-col items-center"
            animate={{ 
              scale: activeTimer?.isActive ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className={`text-7xl font-bold font-mono tracking-tighter tabular-nums transition-colors duration-500
              ${isDanger ? "text-destructive" : isWarning ? "text-amber-500" : "text-foreground"}
            `}>
              {formatTime(elapsed)}
            </div>
            
            {activeTimer?.isActive && (
              <div className="mt-4 h-8 flex items-center justify-center">
                {isDanger ? (
                  <div className="flex items-center text-destructive animate-pulse font-medium bg-destructive/10 px-3 py-1 rounded-full text-sm">
                    <AlertCircle className="w-4 h-4 mr-2" /> 25 min ultrapassados
                  </div>
                ) : isWarning ? (
                  <div className="flex items-center text-amber-500 font-medium bg-amber-500/10 px-3 py-1 rounded-full text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Atenção ao tempo
                  </div>
                ) : (
                  <div className="flex items-center text-primary font-medium bg-primary/10 px-3 py-1 rounded-full text-sm">
                    Corte em andamento
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        <div className="w-full max-w-xs space-y-4">
          {!activeTimer?.isActive ? (
            <Button 
              size="lg" 
              className="w-full h-20 text-xl font-bold rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              onClick={handleStart}
              disabled={startTimer.isPending}
            >
              <Play className="mr-3 h-8 w-8" />
              Iniciar Cronômetro
            </Button>
          ) : (
            <Button 
              size="lg" 
              variant="destructive"
              className="w-full h-20 text-xl font-bold rounded-2xl shadow-[0_0_40px_-10px_rgba(255,0,0,0.5)] hover:scale-[1.02] active:scale-95 transition-all"
              onClick={handleStop}
            >
              <Square className="mr-3 h-8 w-8 fill-current" />
              Finalizar Corte
            </Button>
          )}
        </div>
      </div>

      <Drawer open={showServices} onOpenChange={setShowServices}>
        <DrawerContent className="bg-card text-card-foreground border-border">
          <DrawerHeader>
            <DrawerTitle className="text-xl">Selecione o Serviço</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.map(service => (
                <Button
                  key={service.id}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center border-border hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform"
                  onClick={() => handleServiceSelect(service.label, service.value)}
                  disabled={finishTimer.isPending}
                >
                  <span className="font-bold text-lg">{service.label}</span>
                  <span className="text-sm text-muted-foreground opacity-80">R$ {service.value}</span>
                </Button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-border mt-4">
              <Label className="text-sm font-medium mb-2 block">Outro Valor</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  placeholder="0,00" 
                  className="text-lg font-medium h-14 bg-background border-border focus-visible:ring-primary"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
                <Button 
                  className="h-14 px-8 font-bold text-lg"
                  onClick={handleCustomService}
                  disabled={!customValue || finishTimer.isPending}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </MobileLayout>
  );
}
