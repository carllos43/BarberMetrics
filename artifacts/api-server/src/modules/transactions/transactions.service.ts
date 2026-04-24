import type { TransactionsRepo, TransactionDTO, CreateTxInput } from "./transactions.repository";
import type { PersonalCategoriesRepo, PersonalCategoryDTO } from "../personalCategories/personalCategories.repository";
import type { PersonalBillsRepo } from "../personalBills/personalBills.repository";
import { NotFoundError, ValidationError } from "../../domain/errors";

export interface CategoryWithBalance extends PersonalCategoryDTO {
  saldo: number;
}

export interface CategoryExtractItem {
  id: number;
  type: TransactionDTO["type"];
  amount: number;
  signedAmount: number;
  description: string | null;
  occurredAt: string;
  billId: number | null;
}

export interface PayBillInput {
  billId: number;
  amount: number;
  description?: string | null;
  occurredAt?: string;
}

const SIGN: Record<TransactionDTO["type"], 1 | -1> = {
  entrada: 1,
  gasto: -1,
  pagamento: -1,
};

export class TransactionsService {
  constructor(
    private repo: TransactionsRepo,
    private categories: PersonalCategoriesRepo,
    private bills: PersonalBillsRepo,
  ) {}

  /** Retorna cards com saldo computado em tempo real (transações live). */
  async listCategoriesWithBalance(bsId: string, userId: string): Promise<CategoryWithBalance[]> {
    const cats = await this.categories.ensureSystemCategories(bsId, userId);
    const balances = await this.repo.balancesByCategory(bsId, userId);
    const billsList = await this.bills.list(bsId, userId);
    const today = new Date();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString();
    return Promise.all(cats.map(async (c) => {
      let saldo = balances.get(c.id) ?? 0;
      if (c.slug === "contas") {
        // saldo do card "Contas" = total ativo no mês menos o que já foi pago neste mês
        const totalAtivo = billsList.filter((b) => b.ativa).reduce((s, b) => s + b.valor, 0);
        let pagoMes = 0;
        for (const b of billsList) {
          const txs = await this.repo.listByBill(bsId, userId, b.id, monthStart);
          pagoMes += txs.filter((t) => t.type === "pagamento").reduce((s, t) => s + t.amount, 0);
        }
        saldo = Math.max(0, totalAtivo - pagoMes);
      }
      return { ...c, saldo: +saldo.toFixed(2) };
    }));
  }

  async listExtract(bsId: string, userId: string, categoryId: number): Promise<CategoryExtractItem[]> {
    const cat = await this.categories.findById(bsId, categoryId);
    if (!cat) throw new NotFoundError("Categoria não encontrada");
    const txs = await this.repo.listByCategory(bsId, userId, categoryId, 500);
    return txs.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      signedAmount: SIGN[t.type] * t.amount,
      description: t.description,
      occurredAt: t.occurredAt,
      billId: t.billId,
    }));
  }

  async createTx(bsId: string, input: CreateTxInput) {
    if (input.amount <= 0) throw new ValidationError("Valor deve ser positivo");
    return this.repo.create(bsId, input);
  }

  async updateTx(bsId: string, id: number, patch: Partial<Omit<CreateTxInput, "userId">>) {
    const cur = await this.repo.findById(bsId, id);
    if (!cur || cur.deleted) throw new NotFoundError("Transação não encontrada");
    if (patch.amount !== undefined && patch.amount <= 0) throw new ValidationError("Valor deve ser positivo");
    return this.repo.update(bsId, id, patch);
  }

  async deleteTx(bsId: string, id: number) {
    const cur = await this.repo.findById(bsId, id);
    if (!cur) return;
    await this.repo.softDelete(bsId, id);
  }

  /** Pagar conta: debita do "banco" e gera registro vinculado à conta. */
  async payBill(bsId: string, userId: string, input: PayBillInput): Promise<TransactionDTO> {
    if (input.amount <= 0) throw new ValidationError("Valor do pagamento deve ser positivo");
    const bill = await this.bills.findById(bsId, input.billId);
    if (!bill || bill.userId !== userId) throw new NotFoundError("Conta não encontrada");
    const banco = await this.categories.findBySlug(bsId, userId, "banco")
      ?? (await this.categories.ensureSystemCategories(bsId, userId)).find((c) => c.slug === "banco");
    if (!banco) throw new ValidationError("Card 'Banco' não encontrado");
    return this.repo.create(bsId, {
      userId,
      type: "pagamento",
      amount: input.amount,
      categoryId: banco.id,
      billId: bill.id,
      description: input.description ?? bill.nome,
      occurredAt: input.occurredAt,
    });
  }
}
