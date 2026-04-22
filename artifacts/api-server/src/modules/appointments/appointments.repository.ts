import { and, eq, gte, lte } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";

export interface AppointmentDTO {
  id: number;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  service: string;
  value: number;
  barberEarnings: number;
  createdAt: string;
}

const fromRow = (r: typeof appointmentsTable.$inferSelect): AppointmentDTO => ({
  id: r.id,
  userId: r.userId,
  date: r.date,
  startTime: r.startTime,
  endTime: r.endTime,
  durationMinutes: r.durationMinutes,
  service: r.service,
  value: parseFloat(r.value),
  barberEarnings: parseFloat(r.barberEarnings),
  createdAt: r.createdAt.toISOString(),
});

export interface AppointmentsRepo {
  listByDateRange(bsId: string, start: string, end: string): Promise<AppointmentDTO[]>;
  findById(bsId: string, id: number): Promise<AppointmentDTO | null>;
  create(bsId: string, v: Omit<AppointmentDTO, "id" | "createdAt">): Promise<AppointmentDTO>;
  update(bsId: string, id: number, patch: Partial<Omit<AppointmentDTO, "id" | "createdAt" | "userId">>): Promise<AppointmentDTO | null>;
  delete(bsId: string, id: number): Promise<void>;
}

export class DrizzleAppointmentsRepo implements AppointmentsRepo {
  async listByDateRange(bsId: string, start: string, end: string) {
    const rows = await db.select().from(appointmentsTable).where(and(
      eq(appointmentsTable.barbershopId, bsId),
      gte(appointmentsTable.date, start),
      lte(appointmentsTable.date, end),
    )).orderBy(appointmentsTable.createdAt);
    return rows.map(fromRow);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, bsId), eq(appointmentsTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async create(bsId: string, v: Omit<AppointmentDTO, "id" | "createdAt">) {
    const [r] = await db.insert(appointmentsTable).values({
      barbershopId: bsId,
      userId: v.userId,
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
      durationMinutes: v.durationMinutes,
      service: v.service,
      value: v.value.toString(),
      barberEarnings: v.barberEarnings.toString(),
    }).returning();
    return fromRow(r);
  }
  async update(bsId: string, id: number, patch: Partial<Omit<AppointmentDTO, "id" | "createdAt" | "userId">>) {
    const set: Record<string, unknown> = {};
    if (patch.date !== undefined) set.date = patch.date;
    if (patch.startTime !== undefined) set.startTime = patch.startTime;
    if (patch.endTime !== undefined) set.endTime = patch.endTime;
    if (patch.durationMinutes !== undefined) set.durationMinutes = patch.durationMinutes;
    if (patch.service !== undefined) set.service = patch.service;
    if (patch.value !== undefined) set.value = patch.value.toString();
    if (patch.barberEarnings !== undefined) set.barberEarnings = patch.barberEarnings.toString();

    const [r] = await db.update(appointmentsTable).set(set)
      .where(and(eq(appointmentsTable.barbershopId, bsId), eq(appointmentsTable.id, id)))
      .returning();
    return r ? fromRow(r) : null;
  }
  async delete(bsId: string, id: number) {
    await db.delete(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, bsId), eq(appointmentsTable.id, id)));
  }
}
