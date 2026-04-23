import { and, desc, eq } from "drizzle-orm";
import { db, withdrawalsTable } from "@workspace/db";

export type CategoriaDestino = "gasto_livre" | "conta_fixa" | "reserva";

export interface WithdrawalDTO {
  id: number;
  userId: string;
  weeklyCycleId: number | null;
  valor: number;
  categoriaDestino: CategoriaDestino;
  descricao: string | null;
  isExcedente: boolean;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: typeof withdrawalsTable.$inferSelect): WithdrawalDTO => ({
  id: r.id,
  userId: r.userId,
  weeklyCycleId: r.weeklyCycleId ?? null,
  valor: parseFloat(r.valor),
  categoriaDestino: (r.categoriaDestino as CategoriaDestino) ?? "gasto_livre",
  descricao: r.descricao ?? null,
  isExcedente: r.isExcedente,
  occurredAt: r.occurredAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export interface WithdrawalsRepo {
  list(bsId: string, userId: string, opts?: { cycleId?: number; limit?: number }): Promise<WithdrawalDTO[]>;
  findById(bsId: string, id: number): Promise<WithdrawalDTO | null>;
  create(bsId: string, v: Omit<WithdrawalDTO, "id" | "createdAt" | "updatedAt">): Promise<WithdrawalDTO>;
  update(bsId: string, id: number, patch: Partial<Omit<WithdrawalDTO, "id" | "createdAt" | "updatedAt" | "userId">>): Promise<WithdrawalDTO | null>;
  delete(bsId: string, id: number): Promise<void>;
}

export class DrizzleWithdrawalsRepo implements WithdrawalsRepo {
  async list(bsId: string, userId: string, opts: { cycleId?: number; limit?: number } = {}) {
    const where = opts.cycleId !== undefined
      ? and(eq(withdrawalsTable.barbershopId, bsId), eq(withdrawalsTable.userId, userId), eq(withdrawalsTable.weeklyCycleId, opts.cycleId))
      : and(eq(withdrawalsTable.barbershopId, bsId), eq(withdrawalsTable.userId, userId));
    const q = db.select().from(withdrawalsTable).where(where).orderBy(desc(withdrawalsTable.occurredAt));
    const rows = opts.limit ? await q.limit(opts.limit) : await q;
    return rows.map(fromRow);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(withdrawalsTable)
      .where(and(eq(withdrawalsTable.barbershopId, bsId), eq(withdrawalsTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async create(bsId: string, v: Omit<WithdrawalDTO, "id" | "createdAt" | "updatedAt">) {
    const [r] = await db.insert(withdrawalsTable).values({
      barbershopId: bsId,
      userId: v.userId,
      weeklyCycleId: v.weeklyCycleId ?? null,
      valor: v.valor.toString(),
      categoriaDestino: v.categoriaDestino,
      descricao: v.descricao ?? null,
      isExcedente: v.isExcedente,
      occurredAt: new Date(v.occurredAt),
    }).returning();
    return fromRow(r);
  }
  async update(bsId: string, id: number, patch: Partial<Omit<WithdrawalDTO, "id" | "createdAt" | "updatedAt" | "userId">>) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.valor !== undefined) set.valor = patch.valor.toString();
    if (patch.categoriaDestino !== undefined) set.categoriaDestino = patch.categoriaDestino;
    if (patch.descricao !== undefined) set.descricao = patch.descricao;
    if (patch.isExcedente !== undefined) set.isExcedente = patch.isExcedente;
    if (patch.weeklyCycleId !== undefined) set.weeklyCycleId = patch.weeklyCycleId;
    if (patch.occurredAt !== undefined) set.occurredAt = new Date(patch.occurredAt);
    const [r] = await db.update(withdrawalsTable).set(set)
      .where(and(eq(withdrawalsTable.barbershopId, bsId), eq(withdrawalsTable.id, id))).returning();
    return r ? fromRow(r) : null;
  }
  async delete(bsId: string, id: number) {
    await db.delete(withdrawalsTable)
      .where(and(eq(withdrawalsTable.barbershopId, bsId), eq(withdrawalsTable.id, id)));
  }
}
