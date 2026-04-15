import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <MobileLayout title="Página não encontrada" hideNav>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <Scissors className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Página Não Encontrada</h2>
        <p className="text-muted-foreground mb-8">
          A página que você tentou acessar não existe ou foi movida.
        </p>
        <Link href="/">
          <Button size="lg" className="font-bold rounded-xl h-14 px-8">
            Voltar ao Início
          </Button>
        </Link>
      </div>
    </MobileLayout>
  );
}
