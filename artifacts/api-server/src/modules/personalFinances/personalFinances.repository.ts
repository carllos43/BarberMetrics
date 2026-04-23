import { and, eq } from "drizzle-orm";
import { db, personalFinancesTable } from "@workspace/db";

export interface PersonalFinancesDTO {
  id: number;
  userId: string;
  saldoBanco: number;
  saldoGuardado: number;
  percentualCaixinha: number;
  limiteLazer: number;
  limiteComida: number;
  limiteOutros: number;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: typeof personalFinancesTable.$inferSelect): PersonalFinancesDTO => ({
  id: r.id,
  userId: r.userId,
  saldoBanco: parseFloat(r.saldoBanco),
  saldoGuardado: parseFloat(r.saldoGuardado),
  percentualCaixinha: r.percentualCaixinha,
  limiteLazer: parseFloat(r.limiteLazer),
  limiteComida: parseFloat(r.limiteComida),
  limiteOutros: parseFloat(r.limiteOutros),
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export interface PersonalFinancesRepo {
  getOrCreate(bsId: string, userId: string): Promise<PersonalFinancesDTO>;
  update(bsId: string, userId: string, patch: Partial<Omit<PersonalFinancesDTO, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<PersonalFinancesDTO>;
  /** Aplica uma variação no saldo do banco (positiva=credita, negativa=debita). */
  adjustSaldo(bsId: string, userId: string, deltaBanco: number, deltaGuardado: number): Promise<PersonalFinancesDTO>;
}

export class DrizzlePersonalFinancesRepo implements PersonalFinancesRepo {
  async getOrCreate(bsId: string, userId: string) {
    const [existing] = await db.select().from(personalFinancesTable)
      .where(and(eq(personalFinancesTable.barbershopId, bsId), eq(personalFinancesTable.userId, userId))).limit(1);
    if (existing) return fromRow(existing);
    const [created] = await db.insert(personalFinancesTable).values({
      barbershopId: bsId, userId,
    }).returning();
    return fromRow(created);
  }
  async update(bsId: string, userId: string, patch: Partial<Omit<PersonalFinancesDTO, "id" | "userId" | "createdAt" | "updatedAt">>) {
    await this.getOrCreate(bsId, userId);
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.saldoBanco !== undefined) set.saldoBanco = patch.saldoBanco.toString();
    if (patch.saldoGuardado !== undefined) set.saldoGuardado = patch.saldoGuardado.toString();
    if (patch.percentualCaixinha !== undefined) set.percentualCaixinha = patch.percentualCaixinha;
    if (patch.limiteLazer !== undefined) set.limiteLazer = patch.limiteLazer.toString();
    if (patch.limiteComida !== undefined) set.limiteComida = patch.limiteComida.toString();
    if (patch.limiteOutros !== undefined) set.limiteOutros = patch.limiteOutros.toString();
    const [r] = await db.update(personalFinancesTable).set(set)
      .where(and(eq(personalFinancesTable.barbershopId, bsId), eq(personalFinancesTable.userId, userId)))
      .returning();
    return fromRow(r);
  }
  async adjustSaldo(bsId: string, userId: string, deltaBanco: number, deltaGuardado: number) {
    const cur = await this.getOrCreate(bsId, userId);
    return this.update(bsId, userId, {
      saldoBanco: cur.saldoBanco + deltaBanco,
      saldoGuardado: cur.saldoGuardado + deltaGuardado,
    });
  }
}
