import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  hideNav?: boolean;
}

export function MobileLayout({ children, title, hideNav = false }: MobileLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background w-full pb-20 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {title && (
        <header className="h-16 flex items-center px-4 border-b border-border bg-card sticky top-0 z-40">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
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
