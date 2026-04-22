import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Settings as SettingsIcon } from "lucide-react";
import { useOpenSettings } from "@/lib/settings";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  hideNav?: boolean;
  rightSlot?: ReactNode;
}

export function MobileLayout({ children, title, subtitle, hideNav = false, rightSlot }: MobileLayoutProps) {
  const [location] = useLocation();
  const openSettings = useOpenSettings();

  return (
    <div className="min-h-[100dvh] w-full pb-20 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {title && (
        <header className="h-16 flex items-center justify-between px-4 sticky top-0 z-40 glass-strong">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {rightSlot}
            <button
              onClick={openSettings}
              aria-label="Configurações"
              className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {!hideNav && <BottomNav />}
    </div>
  );
}
