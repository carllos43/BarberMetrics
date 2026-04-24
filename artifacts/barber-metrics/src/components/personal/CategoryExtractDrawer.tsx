import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2, X, Receipt } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pf, type CategoryWithBalance, type ExtractItem } from "@/lib/personalFinances";

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  gasto: "Vale",
  pagamento: "Pagamento",
};

interface Props {
  open: boolean;
  onClose: () => void;
  category: CategoryWithBalance | null;
}

export function CategoryExtractDrawer({ open, onClose, category }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ExtractItem | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", description: "" });

  const extractQ = useQuery({
    queryKey: ["pf", "extract", category?.id],
    queryFn: () => pf.extract(category!.id),
    enabled: !!category && open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pf"] });

  const updateTx = useMutation({
    mutationFn: () => pf.updateTx(editing!.id, {
      amount: parseFloat(editForm.amount.replace(",", ".")),
      description: editForm.description,
    }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast({ title: "Transação atualizada." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteTx = useMutation({
    mutationFn: (id: number) => pf.deleteTx(id),
    onSuccess: () => { invalidate(); toast({ title: "Transação removida." }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleEditOpen = (item: ExtractItem) => {
    setEditing(item);
    setEditForm({ amount: String(item.amount), description: item.description ?? "" });
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="bg-card border-border max-h-[85vh]">
        <DrawerHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base">
              {category?.nome ?? ""}
            </DrawerTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
          {category && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo atual</div>
              <div className={cn(
                "text-3xl font-black tabular-nums",
                category.saldo < 0 ? "text-destructive" : "text-foreground",
              )}>
                {formatCurrency(category.saldo)}
              </div>
            </div>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto p-4 space-y-2">
          {extractQ.isLoading ? (
            <>
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </>
          ) : !extractQ.data || extractQ.data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {category?.slug === "contas"
                ? "Use o botão Pagar nas contas pessoais para registrar pagamentos."
                : "Nenhuma transação por aqui ainda."}
            </div>
          ) : (
            extractQ.data.map((item) => {
              const isIn = item.signedAmount > 0;
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    isIn ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive",
                  )}>
                    {item.billId ? <Receipt className="w-4 h-4" /> : isIn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {item.description || TYPE_LABEL[item.type]}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(parseISO(item.occurredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-sm font-bold tabular-nums",
                      isIn ? "text-emerald-400" : "text-destructive",
                    )}>
                      {isIn ? "+" : "-"} {formatCurrency(item.amount)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!item.billId && (
                      <button onClick={() => handleEditOpen(item)} className="text-muted-foreground hover:text-foreground" aria-label="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Remover esta transação?")) deleteTx.mutate(item.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit modal embutido */}
        {editing && (
          <div className="border-t border-border/40 p-4 space-y-3 bg-card/95">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">Editar transação</div>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Valor</Label>
              <Input
                inputMode="decimal"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="h-10"
              />
            </div>
            <Button
              className="w-full h-10 font-bold"
              onClick={() => updateTx.mutate()}
              disabled={!editForm.amount || updateTx.isPending}
            >
              {updateTx.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
