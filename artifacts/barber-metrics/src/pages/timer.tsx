import { useState, useEffect, useRef, useCallback } from "react";
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
  getGetFinancialSummaryQueryKey,
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, AlertTriangle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SERVICES = [
  { id: "corte", label: "Corte", value: 30 },
  { id: "corte_barba", label: "Corte + Barba", value: 50 },
  { id: "sobrancelha", label: "Sobrancelha", value: 10 },
  { id: "alisamento", label: "Alisamento", value: 80 },
];

const LS_KEY = "barbermetrics_timer_start";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TimerPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [showServices, setShowServices] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // ─── Fetch active timer from server (once + on demand, not every second) ───
  const { data: activeTimer, isLoading: isLoadingTimer } = useGetActiveTimer({
    query: {
      queryKey: getGetActiveTimerQueryKey(),
      // Poll server infrequently — just to keep server state in sync
      // The visual clock is driven by the local timestamp
      refetchInterval: 30_000,
      staleTime: 5_000,
    },
  });

  // ─── Sync server startedAt into local state + localStorage ───
  useEffect(() => {
    if (activeTimer?.isActive && activeTimer.startedAt) {
      const ms = new Date(activeTimer.startedAt).getTime();
      if (!isNaN(ms)) {
        setStartedAtMs(ms);
        localStorage.setItem(LS_KEY, String(ms));
      }
    } else if (!activeTimer?.isActive) {
      // Timer not active on server → clear local state
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        localStorage.removeItem(LS_KEY);
      }
      setStartedAtMs(null);
    }
  }, [activeTimer?.isActive, activeTimer?.startedAt]);

  // ─── On mount: restore from localStorage if server hasn't responded yet ───
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const ms = parseInt(saved, 10);
      if (!isNaN(ms)) {
        setStartedAtMs(ms);
      }
    }
  }, []);

  // ─── Timestamp-based RAF clock — immune to tab switching / screen lock ───
  const tick = useCallback(() => {
    if (startedAtMs !== null) {
      const secs = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsed(secs);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [startedAtMs]);

  useEffect(() => {
    if (startedAtMs !== null) {
      // Immediate tick so the display updates without waiting a frame
      const secs = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsed(secs);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setElapsed(0);
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startedAtMs, tick]);

  // ─── Re-sync when the tab becomes visible again ───
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && startedAtMs !== null) {
        // Immediately recalculate elapsed from real timestamp
        const secs = Math.floor((Date.now() - startedAtMs) / 1000);
        setElapsed(secs);
        // Also re-validate server state
        queryClient.invalidateQueries({ queryKey: getGetActiveTimerQueryKey() });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [startedAtMs, queryClient]);

  // ─── Mutations ───
  const startTimer = useStartTimer({
    mutation: {
      onMutate: () => {
        // Optimistic: set local start immediately for instant feedback
        const now = Date.now();
        setStartedAtMs(now);
        localStorage.setItem(LS_KEY, String(now));
      },
      onSuccess: (data) => {
        // Correct with server timestamp
        const ms = new Date(data.startedAt).getTime();
        if (!isNaN(ms)) {
          setStartedAtMs(ms);
          localStorage.setItem(LS_KEY, String(ms));
        }
        queryClient.invalidateQueries({ queryKey: getGetActiveTimerQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => {
        setStartedAtMs(null);
        localStorage.removeItem(LS_KEY);
      },
    },
  });

  const finishTimer = useFinishTimer({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem(LS_KEY);
        setStartedAtMs(null);
        setElapsed(0);
        queryClient.invalidateQueries({ queryKey: getGetActiveTimerQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
        setShowServices(false);
        setLocation("/");
      },
    },
  });

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

  const isActive = startedAtMs !== null;
  const minutes = Math.floor(elapsed / 60);
  const isWarning = minutes >= 20 && minutes < 25;
  const isDanger = minutes >= 25;

  const timerColor = isDanger
    ? "text-destructive"
    : isWarning
    ? "text-amber-500"
    : isActive
    ? "text-primary"
    : "text-muted-foreground";

  return (
    <MobileLayout title="Timer">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6">

        {isLoadingTimer && !startedAtMs ? (
          <Skeleton className="w-64 h-24 rounded-2xl mb-12" />
        ) : (
          <motion.div
            className="mb-12 flex flex-col items-center gap-5"
            animate={{ scale: isActive ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* Clock face */}
            <div className={`text-8xl font-bold font-mono tracking-tighter tabular-nums transition-colors duration-300 ${timerColor}`}>
              {formatTime(elapsed)}
            </div>

            {/* Status badge */}
            <AnimatePresence mode="wait">
              {isActive && (
                <motion.div
                  key={isDanger ? "danger" : isWarning ? "warning" : "active"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDanger ? (
                    <div className="flex items-center text-destructive font-medium bg-destructive/10 px-4 py-2 rounded-full text-sm gap-2 animate-pulse">
                      <AlertCircle className="w-4 h-4" /> 25 min ultrapassados
                    </div>
                  ) : isWarning ? (
                    <div className="flex items-center text-amber-500 font-medium bg-amber-500/10 px-4 py-2 rounded-full text-sm gap-2">
                      <AlertTriangle className="w-4 h-4" /> Atenção ao tempo
                    </div>
                  ) : (
                    <div className="flex items-center text-primary font-medium bg-primary/10 px-4 py-2 rounded-full text-sm gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                      Corte em andamento
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Elapsed description */}
            {isActive && (
              <p className="text-sm text-muted-foreground">
                {minutes > 0 ? `${minutes} min ${elapsed % 60} seg` : `${elapsed} seg`}
              </p>
            )}
          </motion.div>
        )}

        <div className="w-full max-w-xs space-y-4">
          {!isActive ? (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="w-full h-20 text-xl font-bold rounded-2xl shadow-xl"
                onClick={handleStart}
                disabled={startTimer.isPending}
              >
                <Play className="mr-3 h-7 w-7 fill-current" />
                {startTimer.isPending ? "Iniciando..." : "Iniciar Corte"}
              </Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="destructive"
                className="w-full h-20 text-xl font-bold rounded-2xl"
                onClick={handleStop}
              >
                <Square className="mr-3 h-7 w-7 fill-current" />
                Finalizar Corte
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <Drawer open={showServices} onOpenChange={(open) => { if (!finishTimer.isPending) setShowServices(open); }}>
        <DrawerContent className="bg-card text-card-foreground border-border">
          <DrawerHeader>
            <DrawerTitle className="text-xl">Selecione o Serviço</DrawerTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Duração: {formatTime(elapsed)}
            </p>
          </DrawerHeader>
          <div className="p-4 pb-safe-8 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.map((service) => (
                <motion.div key={service.id} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    className="w-full h-20 flex flex-col items-center justify-center border-border hover:bg-accent hover:border-primary hover:text-primary transition-all"
                    onClick={() => handleServiceSelect(service.label, service.value)}
                    disabled={finishTimer.isPending}
                  >
                    <span className="font-bold text-lg">{service.label}</span>
                    <span className="text-sm opacity-70 mt-0.5">R$ {service.value}</span>
                  </Button>
                </motion.div>
              ))}
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-sm font-medium mb-2 block">Outro Valor</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="text-lg font-medium h-14 bg-background border-border focus-visible:ring-primary"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    className="h-14 px-6 font-bold text-base"
                    onClick={handleCustomService}
                    disabled={!customValue || finishTimer.isPending}
                  >
                    Salvar
                  </Button>
                </motion.div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground pb-2">
              {finishTimer.isPending ? "Salvando atendimento..." : "Toque no serviço para registrar"}
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </MobileLayout>
  );
}
