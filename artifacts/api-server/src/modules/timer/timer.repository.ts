import { and, eq } from "drizzle-orm";
import { db, timerSessionsTable } from "@workspace/db";

export interface TimerSessionDTO {
  id: number;
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
}

const fromRow = (r: typeof timerSessionsTable.$inferSelect): TimerSessionDTO => ({
  id: r.id, startedAt: r.startedAt, endedAt: r.endedAt, isActive: r.isActive,
});

export interface TimerRepo {
  findActive(bsId: string, userId: string): Promise<TimerSessionDTO | null>;
  deactivateActive(bsId: string, userId: string, endedAt: Date): Promise<void>;
  create(bsId: string, userId: string, startedAt: Date): Promise<TimerSessionDTO>;
  deactivateById(id: number, endedAt: Date): Promise<void>;
}

export class DrizzleTimerRepo implements TimerRepo {
  async findActive(bsId: string, userId: string) {
    const [r] = await db.select().from(timerSessionsTable).where(and(
      eq(timerSessionsTable.barbershopId, bsId),
      eq(timerSessionsTable.userId, userId),
      eq(timerSessionsTable.isActive, true),
    )).limit(1);
    return r ? fromRow(r) : null;
  }
  async deactivateActive(bsId: string, userId: string, endedAt: Date) {
    await db.update(timerSessionsTable)
      .set({ isActive: false, endedAt })
      .where(and(
        eq(timerSessionsTable.barbershopId, bsId),
        eq(timerSessionsTable.userId, userId),
        eq(timerSessionsTable.isActive, true),
      ));
  }
  async create(bsId: string, userId: string, startedAt: Date) {
    const [r] = await db.insert(timerSessionsTable).values({
      barbershopId: bsId, userId, isActive: true, startedAt,
    }).returning();
    return fromRow(r);
  }
  async deactivateById(id: number, endedAt: Date) {
    await db.update(timerSessionsTable)
      .set({ isActive: false, endedAt })
      .where(eq(timerSessionsTable.id, id));
  }
}
