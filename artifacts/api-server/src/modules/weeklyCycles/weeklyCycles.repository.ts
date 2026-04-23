import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db, weeklyCyclesTable, appointmentsTable, withdrawalsTable } from "@workspace/db";

export interface WeeklyCycleDTO {
  id: number;
  barbershopId: string;
  userId: string;
  startDate: string;
  endDate: string;
  saldoProduzido: number;
  totalVales: number;
  status: "open" | "closed";
  closedAt: string | null;
  createdAt: string;
}

const fromRow = (r: typeof weeklyCyclesTable.$inferSelect): WeeklyCycleDTO => ({
  id: r.id,
  barbershopId: r.barbershopId,
  userId: r.userId,
  startDate: r.startDate,
  endDate: r.endDate,
  saldoProduzido: parseFloat(r.saldoProduzido),
  totalVales: parseFloat(r.totalVales),
  status: (r.status as "open" | "closed") ?? "open",
  closedAt: r.closedAt ? r.closedAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
});

/** Retorna a segunda-feira (startDate) e o sábado (endDate) que contêm `ref`. */
export function weekRangeFor(ref: Date): { start: string; end: string } {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const day = d.getUTCDay(); // 0=dom, 1=seg, ..., 6=sáb
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + offsetToMonday);
  const saturday = new Date(monday);
  saturday.setUTCDate(monday.getUTCDate() + 5);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { start: iso(monday), end: iso(saturday) };
}

export interface WeeklyCyclesRepo {
  getOrCreateCurrent(bsId: string, userId: string, ref?: Date): Promise<WeeklyCycleDTO>;
  findById(bsId: string, id: number): Promise<WeeklyCycleDTO | null>;
  list(bsId: string, userId: string, limit?: number): Promise<WeeklyCycleDTO[]>;
  listOverdueOpen(today: string): Promise<WeeklyCycleDTO[]>;
  recompute(bsId: string, id: number): Promise<WeeklyCycleDTO | null>;
  close(bsId: string, id: number): Promise<WeeklyCycleDTO | null>;
}

export class DrizzleWeeklyCyclesRepo implements WeeklyCyclesRepo {
  async getOrCreateCurrent(bsId: string, userId: string, ref: Date = new Date()) {
    const { start, end } = weekRangeFor(ref);
    const [existing] = await db.select().from(weeklyCyclesTable)
      .where(and(
        eq(weeklyCyclesTable.barbershopId, bsId),
        eq(weeklyCyclesTable.userId, userId),
        eq(weeklyCyclesTable.startDate, start),
      )).limit(1);
    if (existing) return fromRow(existing);
    const [created] = await db.insert(weeklyCyclesTable).values({
      barbershopId: bsId, userId, startDate: start, endDate: end,
    }).returning();
    return fromRow(created);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(weeklyCyclesTable)
      .where(and(eq(weeklyCyclesTable.barbershopId, bsId), eq(weeklyCyclesTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async list(bsId: string, userId: string, limit = 12) {
    const rows = await db.select().from(weeklyCyclesTable)
      .where(and(eq(weeklyCyclesTable.barbershopId, bsId), eq(weeklyCyclesTable.userId, userId)))
      .orderBy(desc(weeklyCyclesTable.startDate)).limit(limit);
    return rows.map(fromRow);
  }
  async listOverdueOpen(today: string) {
    const rows = await db.select().from(weeklyCyclesTable)
      .where(and(
        eq(weeklyCyclesTable.status, "open"),
        lt(weeklyCyclesTable.endDate, today),
      ));
    return rows.map(fromRow);
  }
  async recompute(bsId: string, id: number) {
    const c = await this.findById(bsId, id);
    if (!c) return null;
    const [{ total: produced = "0" } = { total: "0" }] = await db
      .select({ total: sql<string>`coalesce(sum(coalesce(${appointmentsTable.valorLiquido}, ${appointmentsTable.barberEarnings})), 0)` })
      .from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.barbershopId, bsId),
        eq(appointmentsTable.userId, c.userId),
        gte(appointmentsTable.date, c.startDate),
        lte(appointmentsTable.date, c.endDate),
      ));
    const [{ total: vales = "0" } = { total: "0" }] = await db
      .select({ total: sql<string>`coalesce(sum(${withdrawalsTable.valor}), 0)` })
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.weeklyCycleId, id));
    const [updated] = await db.update(weeklyCyclesTable).set({
      saldoProduzido: produced.toString(),
      totalVales: vales.toString(),
    }).where(eq(weeklyCyclesTable.id, id)).returning();
    return updated ? fromRow(updated) : null;
  }
  async close(bsId: string, id: number) {
    const [r] = await db.update(weeklyCyclesTable).set({
      status: "closed", closedAt: new Date(),
    }).where(and(eq(weeklyCyclesTable.barbershopId, bsId), eq(weeklyCyclesTable.id, id))).returning();
    return r ? fromRow(r) : null;
  }
}
