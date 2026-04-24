import type { TransactionsRepo, TransactionDTO } from "../transactions/transactions.repository";
import type { PersonalCategoriesRepo, PersonalCategoryDTO } from "../personalCategories/personalCategories.repository";
import type { AppointmentsRepo } from "../appointments/appointments.repository";

export interface ReportRow {
  occurredAt: string;
  type: TransactionDTO["type"] | "atendimento";
  categoryId: number | null;
  categoryName: string;
  description: string;
  amount: number;
  signed: number;
}

export interface PersonalReport {
  startDate: string;
  endDate: string;
  rows: ReportRow[];
  totals: {
    produzido: number;
    vales: number;
    contasPagas: number;
    saldoLiquido: number;
  };
}

const SIGN: Record<TransactionDTO["type"], 1 | -1> = { entrada: 1, gasto: -1, pagamento: -1 };

export class PersonalReportsService {
  constructor(
    private txRepo: TransactionsRepo,
    private catsRepo: PersonalCategoriesRepo,
    private appts: AppointmentsRepo,
  ) {}

  async generate(bsId: string, userId: string, startISO: string, endISO: string): Promise<PersonalReport> {
    const cats = await this.catsRepo.list(bsId, userId);
    const catMap = new Map<number, PersonalCategoryDTO>(cats.map((c) => [c.id, c]));
    const txs = await this.txRepo.listByRange(bsId, userId, startISO, endISO);
    const startDate = startISO.slice(0, 10);
    const endDate = endISO.slice(0, 10);
    const apptRows = await this.appts.listByDateRange(bsId, startDate, endDate);

    const rows: ReportRow[] = [];

    for (const a of apptRows) {
      if (a.userId !== userId) continue;
      const liquido = a.valorLiquido != null ? a.valorLiquido : a.barberEarnings;
      const dt = `${a.date}T${a.startTime}:00`;
      rows.push({
        occurredAt: new Date(dt).toISOString(),
        type: "atendimento",
        categoryId: null,
        categoryName: "Produzido",
        description: a.service,
        amount: liquido,
        signed: liquido,
      });
    }

    for (const t of txs) {
      const cat = t.categoryId != null ? catMap.get(t.categoryId) : undefined;
      rows.push({
        occurredAt: t.occurredAt,
        type: t.type,
        categoryId: t.categoryId,
        categoryName: cat?.nome ?? (t.type === "pagamento" ? "Conta paga" : "—"),
        description: t.description ?? "",
        amount: t.amount,
        signed: SIGN[t.type] * t.amount,
      });
    }

    rows.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    const produzido = apptRows
      .filter((a) => a.userId === userId)
      .reduce((s, a) => s + (a.valorLiquido != null ? a.valorLiquido : a.barberEarnings), 0);
    const vales = txs.filter((t) => t.type === "gasto").reduce((s, t) => s + t.amount, 0);
    const contasPagas = txs.filter((t) => t.type === "pagamento").reduce((s, t) => s + t.amount, 0);
    const saldoLiquido = produzido - vales - contasPagas;

    return {
      startDate,
      endDate,
      rows,
      totals: {
        produzido: +produzido.toFixed(2),
        vales: +vales.toFixed(2),
        contasPagas: +contasPagas.toFixed(2),
        saldoLiquido: +saldoLiquido.toFixed(2),
      },
    };
  }
}
