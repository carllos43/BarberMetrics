import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";

export type TxType = "entrada" | "gasto" | "pagamento";

export interface TransactionDTO {
  id: number;
  type: TxType;
  amount: number;
  categoryId: number | null;
  billId: number | null;
  description: string | null;
  occurredAt: string;
  deleted: boolean;
}

const fromRow = (r: typeof transactionsTable.$inferSelect): TransactionDTO => ({
  id: r.id,
  type: r.type as TxType,
  amount: parseFloat(r.amount),
  categoryId: r.categoryId,
  billId: r.billId,
  description: r.description,
  occurredAt: r.occurredAt.toISOString(),
  deleted: r.deleted,
});

export interface CreateTxInput {
  userId: string;
  type: TxType;
  amount: number;
  categoryId?: number | null;
  billId?: number | null;
  description?: string | null;
  occurredAt?: string;
}

export interface TransactionsRepo {
  listByCategory(bsId: string, userId: string, categoryId: number, limit?: number): Promise<TransactionDTO[]>;
  listByRange(bsId: string, userId: string, startISO: string, endISO: string): Promise<TransactionDTO[]>;
  listByBill(bsId: string, userId: string, billId: number, fromISO?: string): Promise<TransactionDTO[]>;
  findById(bsId: string, id: number): Promise<TransactionDTO | null>;
  create(bsId: string, v: CreateTxInput): Promise<TransactionDTO>;
  update(bsId: string, id: number, patch: Partial<Omit<CreateTxInput, "userId">>): Promise<TransactionDTO | null>;
  softDelete(bsId: string, id: number): Promise<void>;
  /** Saldo por categoria. Retorna { categoryId: balance } com balance signed. */
  balancesByCategory(bsId: string, userId: string): Promise<Map<number, number>>;
}

const SIGN_SQL = sql`CASE WHEN ${transactionsTable.type} = 'entrada' THEN ${transactionsTable.amount}::numeric ELSE -${transactionsTable.amount}::numeric END`;

export class DrizzleTransactionsRepo implements TransactionsRepo {
  async listByCategory(bsId: string, userId: string, categoryId: number, limit = 200) {
    const rows = await db.select().from(transactionsTable).where(and(
      eq(transactionsTable.barbershopId, bsId),
      eq(transactionsTable.userId, userId),
      eq(transactionsTable.categoryId, categoryId),
      eq(transactionsTable.deleted, false),
    )).orderBy(desc(transactionsTable.occurredAt)).limit(limit);
    return rows.map(fromRow);
  }
  async listByRange(bsId: string, userId: string, startISO: string, endISO: string) {
    const rows = await db.select().from(transactionsTable).where(and(
      eq(transactionsTable.barbershopId, bsId),
      eq(transactionsTable.userId, userId),
      eq(transactionsTable.deleted, false),
      gte(transactionsTable.occurredAt, new Date(startISO)),
      lte(transactionsTable.occurredAt, new Date(endISO)),
    )).orderBy(desc(transactionsTable.occurredAt));
    return rows.map(fromRow);
  }
  async listByBill(bsId: string, userId: string, billId: number, fromISO?: string) {
    const conds = [
      eq(transactionsTable.barbershopId, bsId),
      eq(transactionsTable.userId, userId),
      eq(transactionsTable.billId, billId),
      eq(transactionsTable.deleted, false),
    ];
    if (fromISO) conds.push(gte(transactionsTable.occurredAt, new Date(fromISO)));
    const rows = await db.select().from(transactionsTable).where(and(...conds))
      .orderBy(desc(transactionsTable.occurredAt));
    return rows.map(fromRow);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.barbershopId, bsId), eq(transactionsTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async create(bsId: string, v: CreateTxInput) {
    const [r] = await db.insert(transactionsTable).values({
      barbershopId: bsId,
      userId: v.userId,
      type: v.type,
      amount: v.amount.toString(),
      categoryId: v.categoryId ?? null,
      billId: v.billId ?? null,
      description: v.description ?? null,
      occurredAt: v.occurredAt ? new Date(v.occurredAt) : new Date(),
    }).returning();
    return fromRow(r);
  }
  async update(bsId: string, id: number, patch: Partial<Omit<CreateTxInput, "userId">>) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.type !== undefined) set.type = patch.type;
    if (patch.amount !== undefined) set.amount = patch.amount.toString();
    if (patch.categoryId !== undefined) set.categoryId = patch.categoryId;
    if (patch.billId !== undefined) set.billId = patch.billId;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.occurredAt !== undefined) set.occurredAt = new Date(patch.occurredAt);
    const [r] = await db.update(transactionsTable).set(set)
      .where(and(eq(transactionsTable.barbershopId, bsId), eq(transactionsTable.id, id)))
      .returning();
    return r ? fromRow(r) : null;
  }
  async softDelete(bsId: string, id: number) {
    await db.update(transactionsTable)
      .set({ deleted: true, updatedAt: new Date() })
      .where(and(eq(transactionsTable.barbershopId, bsId), eq(transactionsTable.id, id)));
  }
  async balancesByCategory(bsId: string, userId: string) {
    const rows = await db.select({
      categoryId: transactionsTable.categoryId,
      total: sql<string>`COALESCE(SUM(${SIGN_SQL}), 0)`,
    }).from(transactionsTable).where(and(
      eq(transactionsTable.barbershopId, bsId),
      eq(transactionsTable.userId, userId),
      eq(transactionsTable.deleted, false),
    )).groupBy(transactionsTable.categoryId);
    const map = new Map<number, number>();
    for (const r of rows) {
      if (r.categoryId != null) map.set(r.categoryId, parseFloat(r.total));
    }
    return map;
  }
}
