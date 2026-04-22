import { Link, useLocation } from "wouter";
import { Clock, Home, ListOrdered, BarChart2, Wallet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/timer", icon: Clock, label: "Timer" },
  { path: "/atendimentos", icon: ListOrdered, label: "Histórico" },
  { path: "/produtividade", icon: BarChart2, label: "Métricas" },
  { path: "/financas", icon: Wallet, label: "Finanças" },
  { path: "/relatorios", icon: FileText, label: "Relatórios" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-3 h-16 glass-strong rounded-2xl flex items-center justify-around px-1 shadow-2xl">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all min-w-0",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
