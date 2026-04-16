import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, timerSessionsTable, appointmentsTable, settingsTable } from "@workspace/db";
import {
  StartTimerResponse,
  GetActiveTimerResponse,
  FinishTimerBody,
  FinishTimerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const BR_TZ = "America/Sao_Paulo";

async function getCommission(): Promise<number> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "commission_percent")).limit(1);
  return row ? parseFloat(row.value) : 60;
}

function toBRDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toBRTimeStr(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

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

  // Store date and times in Brazil timezone so history displays correctly
  const today = toBRDateStr(now);
  const startTimeStr = toBRTimeStr(startedAt);
  const endTimeStr = toBRTimeStr(now);

  const serviceName = parsed.data.customService && parsed.data.service === "outro"
    ? parsed.data.customService
    : parsed.data.service;

  const value = parsed.data.value;
  const commission = await getCommission();
  const barberEarnings = value * (commission / 100);

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
