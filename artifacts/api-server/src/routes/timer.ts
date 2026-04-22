import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, timerSessionsTable, appointmentsTable, usersTable } from "@workspace/db";
import {
  StartTimerResponse,
  GetActiveTimerResponse,
  FinishTimerBody,
  FinishTimerResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const BR_TZ = "America/Sao_Paulo";

async function getCommission(userId: string): Promise<number> {
  const [row] = await db.select({ pct: usersTable.commissionPercent }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return row ? row.pct : 60;
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
  const userId = req.userId!;
  // Deactivate any existing active timer for this user
  await db
    .update(timerSessionsTable)
    .set({ isActive: false, endedAt: new Date() })
    .where(and(eq(timerSessionsTable.userId, userId), eq(timerSessionsTable.isActive, true)));

  const [session] = await db
    .insert(timerSessionsTable)
    .values({ userId, isActive: true, startedAt: new Date() })
    .returning();

  res.json(StartTimerResponse.parse({
    id: session.id.toString(),
    startedAt: session.startedAt.toISOString(),
    elapsedSeconds: 0,
    isActive: true,
  }));
});

router.get("/timer/active", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [session] = await db
    .select()
    .from(timerSessionsTable)
    .where(and(eq(timerSessionsTable.userId, userId), eq(timerSessionsTable.isActive, true)))
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
  const userId = req.userId!;
  const parsed = FinishTimerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(timerSessionsTable)
    .where(and(eq(timerSessionsTable.userId, userId), eq(timerSessionsTable.isActive, true)))
    .limit(1);

  const now = new Date();
  const startedAt = session ? session.startedAt : now;
  const durationMs = now.getTime() - startedAt.getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

  if (session) {
    await db
      .update(timerSessionsTable)
      .set({ isActive: false, endedAt: now })
      .where(eq(timerSessionsTable.id, session.id));
  }

  const today = toBRDateStr(now);
  const startTimeStr = toBRTimeStr(startedAt);
  const endTimeStr = toBRTimeStr(now);

  const serviceName = parsed.data.customService && parsed.data.service === "outro"
    ? parsed.data.customService
    : parsed.data.service;

  const value = parsed.data.value;
  const commission = await getCommission(userId);
  const barberEarnings = value * (commission / 100);

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      userId,
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
