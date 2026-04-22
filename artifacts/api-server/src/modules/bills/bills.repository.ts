import { and, eq } from "drizzle-orm";
import { db, billsTable } from "@workspace/db";

export interface BillDTO {
  id: number;
  userId: string;
  name: string;
  value: number;
  dueDay: number;
  category: string | null;
  createdAt: string;
}

const fromRow = (r: typeof billsTable.$inferSelect): BillDTO => ({
  id: r.id,
  userId: r.userId,
  name: r.name,
  value: parseFloat(r.value),
  dueDay: r.dueDay,
  category: r.category ?? null,
  createdAt: r.createdAt.toISOString(),
});

export interface BillsRepo {
  list(bsId: string): Promise<BillDTO[]>;
  findById(bsId: string, id: number): Promise<BillDTO | null>;
  create(bsId: string, v: Omit<BillDTO, "id" | "createdAt">): Promise<BillDTO>;
  update(bsId: string, id: number, patch: Partial<Omit<BillDTO, "id" | "createdAt" | "userId">>): Promise<BillDTO | null>;
  delete(bsId: string, id: number): Promise<void>;
  totalValue(bsId: string): Promise<number>;
}

export class DrizzleBillsRepo implements BillsRepo {
  async list(bsId: string) {
    const rows = await db.select().from(billsTable)
      .where(eq(billsTable.barbershopId, bsId)).orderBy(billsTable.dueDay);
    return rows.map(fromRow);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(billsTable)
      .where(and(eq(billsTable.barbershopId, bsId), eq(billsTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async create(bsId: string, v: Omit<BillDTO, "id" | "createdAt">) {
    const [r] = await db.insert(billsTable).values({
      barbershopId: bsId,
      userId: v.userId,
      name: v.name,
      value: v.value.toString(),
      dueDay: v.dueDay,
      category: v.category ?? "Fixa",
    }).returning();
    return fromRow(r);
  }
  async update(bsId: string, id: number, patch: Partial<Omit<BillDTO, "id" | "createdAt" | "userId">>) {
    const set: Record<string, unknown> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.value !== undefined) set.value = patch.value.toString();
    if (patch.dueDay !== undefined) set.dueDay = patch.dueDay;
    if (patch.category !== undefined) set.category = patch.category;
    const [r] = await db.update(billsTable).set(set)
      .where(and(eq(billsTable.barbershopId, bsId), eq(billsTable.id, id)))
      .returning();
    return r ? fromRow(r) : null;
  }
  async delete(bsId: string, id: number) {
    await db.delete(billsTable)
      .where(and(eq(billsTable.barbershopId, bsId), eq(billsTable.id, id)));
  }
  async totalValue(bsId: string) {
    const rows = await db.select({ value: billsTable.value }).from(billsTable)
      .where(eq(billsTable.barbershopId, bsId));
    return rows.reduce((s, r) => s + parseFloat(r.value), 0);
  }
}
