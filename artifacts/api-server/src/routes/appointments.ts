import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, appointmentsTable, usersTable } from "@workspace/db";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  DeleteAppointmentParams,
  UpdateAppointmentBody,
  ListAppointmentsResponse,
  GetAppointmentResponse,
} from "@workspace/api-zod";
const router: IRouter = Router();

const BR_TZ = "America/Sao_Paulo";

function toBRDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

async function getCommission(userId: string): Promise<number> {
  const [row] = await db.select({ pct: usersTable.commissionPercent }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return row ? row.pct : 60;
}

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  const today = toBRDateStr(now);

  if (period === "today") {
    return { start: today, end: today };
  } else if (period === "week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toBRDateStr(monday), end: toBRDateStr(sunday) };
  } else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toBRDateStr(start), end: toBRDateStr(end) };
  } else if (period === "year") {
    return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
  }
  return { start: today, end: today };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const query = ListAppointmentsQueryParams.safeParse(req.query);
  const period = query.success ? (query.data.period ?? "today") : "today";
  const { start, end } = getPeriodDates(period);

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.userId, userId),
      gte(appointmentsTable.date, start),
      lte(appointmentsTable.date, end),
    ))
    .orderBy(appointmentsTable.createdAt);

  const mapped = appointments.map((a) => ({
    ...a,
    value: parseFloat(a.value),
    barberEarnings: parseFloat(a.barberEarnings),
  }));

  res.json(ListAppointmentsResponse.parse(mapped));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const today = toBRDateStr(now);
  const timeStr = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);

  const commission = await getCommission(userId);
  const value = parsed.data.value;
  const barberEarnings = value * (commission / 100);

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      userId,
      date: parsed.data.date ?? today,
      startTime: parsed.data.startTime ?? timeStr,
      endTime: parsed.data.endTime ?? timeStr,
      durationMinutes: parsed.data.durationMinutes,
      service: parsed.data.service,
      value: value.toString(),
      barberEarnings: barberEarnings.toString(),
    })
    .returning();

  res.status(201).json(GetAppointmentResponse.parse({
    ...appointment,
    value: parseFloat(appointment.value),
    barberEarnings: parseFloat(appointment.barberEarnings),
  }));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.userId, userId)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const startTime = parsed.data.startTime ?? existing.startTime;
  const endTime = parsed.data.endTime ?? existing.endTime;

  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
  const durationMinutes = Math.max(1, toMin(endTime) - toMin(startTime));

  const value = parsed.data.value ?? parseFloat(existing.value);
  const commission = await getCommission(userId);
  const barberEarnings = value * (commission / 100);

  const [updated] = await db
    .update(appointmentsTable)
    .set({
      date: parsed.data.date ?? existing.date,
      startTime,
      endTime,
      durationMinutes,
      service: parsed.data.service ?? existing.service,
      value: value.toString(),
      barberEarnings: barberEarnings.toString(),
    })
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.userId, userId)))
    .returning();

  res.json(GetAppointmentResponse.parse({
    ...updated,
    value: parseFloat(updated.value),
    barberEarnings: parseFloat(updated.barberEarnings),
  }));
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [appointment] = await db
    .select()
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.userId, userId)));

  if (!appointment) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  res.json(GetAppointmentResponse.parse({
    ...appointment,
    value: parseFloat(appointment.value),
    barberEarnings: parseFloat(appointment.barberEarnings),
  }));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
