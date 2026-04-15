import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  DeleteAppointmentParams,
  ListAppointmentsResponse,
  GetAppointmentResponse,
  FinishTimerBody,
  FinishTimerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (period === "today") {
    return { start: today, end: today };
  } else if (period === "week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  } else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  } else if (period === "year") {
    return {
      start: `${now.getFullYear()}-01-01`,
      end: `${now.getFullYear()}-12-31`,
    };
  }
  return { start: today, end: today };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const query = ListAppointmentsQueryParams.safeParse(req.query);
  const period = query.success ? (query.data.period ?? "today") : "today";
  const { start, end } = getPeriodDates(period);

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, start), lte(appointmentsTable.date, end)))
    .orderBy(appointmentsTable.createdAt);

  const mapped = appointments.map((a) => ({
    ...a,
    value: parseFloat(a.value),
    barberEarnings: parseFloat(a.barberEarnings),
  }));

  res.json(ListAppointmentsResponse.parse(mapped));
});

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 8);

  const value = parsed.data.value;
  const barberEarnings = value * 0.6;

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
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

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [appointment] = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.id, params.data.id));

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
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
