import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, timerSessionsTable, appointmentsTable } from "@workspace/db";
import {
  StartTimerResponse,
  GetActiveTimerResponse,
  FinishTimerBody,
  FinishTimerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/timer/start", async (req, res): Promise<void> => {
  // Deactivate any existing active timer
  await db
    .update(timerSessionsTable)
    .set({ isActive: false, endedAt: new Date() })
    .where(eq(timerSessionsTable.isActive, true));

  const [session] = await db
    .insert(timerSessionsTable)
    .values({ isActive: true, startedAt: new Date() })
    .returning();

  const elapsedSeconds = 0;

  res.json(StartTimerResponse.parse({
    id: session.id.toString(),
    startedAt: session.startedAt.toISOString(),
    elapsedSeconds,
    isActive: true,
  }));
});

router.get("/timer/active", async (req, res): Promise<void> => {
  const [session] = await db
    .select()
    .from(timerSessionsTable)
    .where(eq(timerSessionsTable.isActive, true))
    .limit(1);

  if (!session) {
    res.json(GetActiveTimerResponse.parse({
      id: "",
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      isActive: false,
    }));
    return;
  }

  const elapsedSeconds = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

  res.json(GetActiveTimerResponse.parse({
    id: session.id.toString(),
    startedAt: session.startedAt.toISOString(),
    elapsedSeconds,
    isActive: true,
  }));
});

router.post("/timer/finish", async (req, res): Promise<void> => {
  const parsed = FinishTimerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(timerSessionsTable)
    .where(eq(timerSessionsTable.isActive, true))
    .limit(1);

  const now = new Date();
  const startedAt = session ? session.startedAt : now;
  const durationMs = now.getTime() - startedAt.getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

  // Deactivate timer
  if (session) {
    await db
      .update(timerSessionsTable)
      .set({ isActive: false, endedAt: now })
      .where(eq(timerSessionsTable.id, session.id));
  }

  const today = now.toISOString().split("T")[0];
  const startTimeStr = startedAt.toTimeString().slice(0, 8);
  const endTimeStr = now.toTimeString().slice(0, 8);

  const serviceName = parsed.data.customService && parsed.data.service === "outro"
    ? parsed.data.customService
    : parsed.data.service;

  const value = parsed.data.value;
  const barberEarnings = value * 0.6;

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      date: today,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes,
      service: serviceName,
      value: value.toString(),
      barberEarnings: barberEarnings.toString(),
    })
    .returning();

  res.json(FinishTimerResponse.parse({
    ...appointment,
    value: parseFloat(appointment.value),
    barberEarnings: parseFloat(appointment.barberEarnings),
  }));
});

export default router;
