import type { WeeklyCyclesRepo } from "../weeklyCycles/weeklyCycles.repository";
import type { WithdrawalsRepo, CategoriaDestino } from "../withdrawals/withdrawals.repository";
import type { PersonalFinancesRepo, PersonalFinancesDTO } from "./personalFinances.repository";
import type { PersonalBillsRepo, PersonalBillDTO } from "../personalBills/personalBills.repository";
import { NotFoundError, ValidationError } from "../../domain/errors";

/** Quanto sobrou no ciclo atual = produzido - vales. Pode ficar negativo (excedente). */
export interface SaldoSemanal {
  cycleId: number;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  produzido: number;
  vales: number;
  saldoDisponivel: number;
  diasRestantes: number;
  limiteDiarioSugerido: number;
}

export interface CreateWithdrawalInput {
  valor: number;
  categoriaDestino: CategoriaDestino;
  descricao?: string | null;
  occurredAt?: string;
}

export interface CloseWeekResult {
  cycleId: number;
  saldoTransferido: number;
  caixinha: number;
  pessoal: PersonalFinancesDTO;
}

/**
 * Coordena ciclo semanal, vales e saldos pessoais.
 * Regras:
 *  - vale > saldo → marca isExcedente=true mas permite a operação
 *  - fechamento de semana: transfere produzido-vales pro saldoBanco e
 *    desconta `percentualCaixinha` pra `saldoGuardado`
 */
export class PersonalFinancesService {
  constructor(
    private cycles: WeeklyCyclesRepo,
    private withdrawals: WithdrawalsRepo,
    private finances: PersonalFinancesRepo,
    private bills: PersonalBillsRepo,
  ) {}

  async getOverview(bsId: string, userId: string): Promise<{
    semana: SaldoSemanal;
    pessoal: PersonalFinancesDTO;
    contas: PersonalBillDTO[];
  }> {
    const cycle = await this.cycles.getOrCreateCurrent(bsId, userId);
    const recomputed = await this.cycles.recompute(bsId, cycle.id) ?? cycle;
    const saldoDisponivel = recomputed.saldoProduzido - recomputed.totalVales;
    const today = new Date();
    const end = new Date(recomputed.endDate + "T00:00:00Z");
    const diasRestantes = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / 86400000) + 1);
    const semana: SaldoSemanal = {
      cycleId: recomputed.id,
      startDate: recomputed.startDate,
      endDate: recomputed.endDate,
      status: recomputed.status,
      produzido: recomputed.saldoProduzido,
      vales: recomputed.totalVales,
      saldoDisponivel,
      diasRestantes,
      limiteDiarioSugerido: saldoDisponivel > 0 ? saldoDisponivel / diasRestantes : 0,
    };
    const [pessoal, contas] = await Promise.all([
      this.finances.getOrCreate(bsId, userId),
      this.bills.list(bsId, userId),
    ]);
    return { semana, pessoal, contas };
  }

  async createWithdrawal(bsId: string, userId: string, input: CreateWithdrawalInput) {
    if (input.valor <= 0) throw new ValidationError("Valor do vale deve ser positivo");
    const cycle = await this.cycles.getOrCreateCurrent(bsId, userId);
    const recomputed = await this.cycles.recompute(bsId, cycle.id) ?? cycle;
    const saldoDisponivel = recomputed.saldoProduzido - recomputed.totalVales;
    const isExcedente = input.valor > saldoDisponivel;
    const w = await this.withdrawals.create(bsId, {
      userId,
      weeklyCycleId: cycle.id,
      valor: input.valor,
      categoriaDestino: input.categoriaDestino,
      descricao: input.descricao ?? null,
      isExcedente,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    });
    await this.cycles.recompute(bsId, cycle.id);
    return w;
  }

  async updateWithdrawal(bsId: string, id: number, patch: Partial<CreateWithdrawalInput>) {
    const w = await this.withdrawals.findById(bsId, id);
    if (!w) throw new NotFoundError("Vale não encontrado");
    const updated = await this.withdrawals.update(bsId, id, {
      valor: patch.valor,
      categoriaDestino: patch.categoriaDestino,
      descricao: patch.descricao,
      occurredAt: patch.occurredAt,
    });
    if (w.weeklyCycleId) await this.cycles.recompute(bsId, w.weeklyCycleId);
    return updated;
  }

  async deleteWithdrawal(bsId: string, id: number) {
    const w = await this.withdrawals.findById(bsId, id);
    if (!w) return;
    await this.withdrawals.delete(bsId, id);
    if (w.weeklyCycleId) await this.cycles.recompute(bsId, w.weeklyCycleId);
  }

  /** "RPC" fechar_semana: transfere saldo do ciclo pra saldoBanco/saldoGuardado. */
  async closeWeek(bsId: string, userId: string, cycleId: number): Promise<CloseWeekResult> {
    const cycle = await this.cycles.findById(bsId, cycleId);
    if (!cycle) throw new NotFoundError("Ciclo não encontrado");
    if (cycle.userId !== userId) throw new ValidationError("Ciclo de outro profissional");
    if (cycle.status === "closed") throw new ValidationError("Ciclo já fechado");
    const recomputed = await this.cycles.recompute(bsId, cycleId) ?? cycle;
    const saldo = Math.max(0, recomputed.saldoProduzido - recomputed.totalVales);
    const finances = await this.finances.getOrCreate(bsId, userId);
    const caixinha = +(saldo * (finances.percentualCaixinha / 100)).toFixed(2);
    const banco = +(saldo - caixinha).toFixed(2);
    const pessoal = await this.finances.adjustSaldo(bsId, userId, banco, caixinha);
    await this.cycles.close(bsId, cycleId);
    return { cycleId, saldoTransferido: banco, caixinha, pessoal };
  }
}
