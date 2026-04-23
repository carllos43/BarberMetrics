import { and, eq } from "drizzle-orm";
import { db, personalBillsTable } from "@workspace/db";

export interface PersonalBillDTO {
  id: number;
  userId: string;
  nome: string;
  valor: number;
  diaVencimento: number;
  categoria: string;
  ativa: boolean;
  createdAt: string;
  updatedAt: string;
}

const fromRow = (r: typeof personalBillsTable.$inferSelect): PersonalBillDTO => ({
  id: r.id,
  userId: r.userId,
  nome: r.nome,
  valor: parseFloat(r.valor),
  diaVencimento: r.diaVencimento,
  categoria: r.categoria,
  ativa: r.ativa,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export interface PersonalBillsRepo {
  list(bsId: string, userId: string): Promise<PersonalBillDTO[]>;
  findById(bsId: string, id: number): Promise<PersonalBillDTO | null>;
  create(bsId: string, v: Omit<PersonalBillDTO, "id" | "createdAt" | "updatedAt">): Promise<PersonalBillDTO>;
  update(bsId: string, id: number, patch: Partial<Omit<PersonalBillDTO, "id" | "createdAt" | "updatedAt" | "userId">>): Promise<PersonalBillDTO | null>;
  delete(bsId: string, id: number): Promise<void>;
}

export class DrizzlePersonalBillsRepo implements PersonalBillsRepo {
  async list(bsId: string, userId: string) {
    const rows = await db.select().from(personalBillsTable)
      .where(and(eq(personalBillsTable.barbershopId, bsId), eq(personalBillsTable.userId, userId)))
      .orderBy(personalBillsTable.diaVencimento);
    return rows.map(fromRow);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(personalBillsTable)
      .where(and(eq(personalBillsTable.barbershopId, bsId), eq(personalBillsTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async create(bsId: string, v: Omit<PersonalBillDTO, "id" | "createdAt" | "updatedAt">) {
    const [r] = await db.insert(personalBillsTable).values({
      barbershopId: bsId,
      userId: v.userId,
      nome: v.nome,
      valor: v.valor.toString(),
      diaVencimento: v.diaVencimento,
      categoria: v.categoria,
      ativa: v.ativa,
    }).returning();
    return fromRow(r);
  }
  async update(bsId: string, id: number, patch: Partial<Omit<PersonalBillDTO, "id" | "createdAt" | "updatedAt" | "userId">>) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.nome !== undefined) set.nome = patch.nome;
    if (patch.valor !== undefined) set.valor = patch.valor.toString();
    if (patch.diaVencimento !== undefined) set.diaVencimento = patch.diaVencimento;
    if (patch.categoria !== undefined) set.categoria = patch.categoria;
    if (patch.ativa !== undefined) set.ativa = patch.ativa;
    const [r] = await db.update(personalBillsTable).set(set)
      .where(and(eq(personalBillsTable.barbershopId, bsId), eq(personalBillsTable.id, id))).returning();
    return r ? fromRow(r) : null;
  }
  async delete(bsId: string, id: number) {
    await db.delete(personalBillsTable)
      .where(and(eq(personalBillsTable.barbershopId, bsId), eq(personalBillsTable.id, id)));
  }
}
