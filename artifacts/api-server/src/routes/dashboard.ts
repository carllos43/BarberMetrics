import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, appointmentsTable, timerSessionsTable, settingsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetDailyGoalResponse,
  UpdateDailyGoalBody,
  UpdateDailyGoalResponse,
  GetWorkHoursResponse,
  UpdateWorkHoursBody,
  UpdateWorkHoursResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getSetting(key: string, defaultValue: string): Promise<string> {
  const [setting] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);
  return setting ? setting.value : defaultValue;
}

async function upsertSetting(key: string, value: string): Promise<void> {
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settingsTable)
      .set({ value })
      .where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const todayAppointments = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, today), lte(appointmentsTable.date, today)));

  const [activeTimer] = await db
    .select()
    .from(timerSessionsTable)
    .where(eq(timerSessionsTable.isActive, true))
    .limit(1);

  const dailyGoal = parseFloat(await getSetting("daily_goal", "200"));

  const grossRevenue = todayAppointments.reduce((sum, a) => sum + parseFloat(a.value), 0);
  const barberEarnings = todayAppointments.reduce((sum, a) => sum + parseFloat(a.barberEarnings), 0);
  const totalDuration = todayAppointments.reduce((sum, a) => sum + a.durationMinutes, 0);
  const avgDurationMinutes = todayAppointments.length > 0 ? totalDuration / todayAppointments.length : 0;

  // Earnings per hour based on total time working
  const hoursWorked = totalDuration / 60;
  const earningsPerHour = hoursWorked > 0 ? barberEarnings / hoursWorked : 0;

  const goalProgress = dailyGoal > 0 ? Math.min(100, (barberEarnings / dailyGoal) * 100) : 0;

  res.json(GetDashboardSummaryResponse.parse({
    clientsToday: todayAppointments.length,
    grossRevenue,
    barberEarnings,
    avgDurationMinutes,
    earningsPerHour,
    dailyGoal,
    goalProgress,
    isTimerActive: !!activeTimer,
    timerStartedAt: activeTimer ? activeTimer.startedAt.toISOString() : null,
  }));
});

router.get("/settings/daily-goal", async (req, res): Promise<void> => {
  const goal = parseFloat(await getSetting("daily_goal", "200"));
  res.json(GetDailyGoalResponse.parse({ goal }));
});

router.put("/settings/daily-goal", async (req, res): Promise<void> => {
  const parsed = UpdateDailyGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await upsertSetting("daily_goal", parsed.data.goal.toString());
  res.json(UpdateDailyGoalResponse.parse({ goal: parsed.data.goal }));
});

router.get("/settings/work-hours", async (req, res): Promise<void> => {
  const hoursPerDay = parseFloat(await getSetting("hours_per_day", "8"));
  const daysPerWeek = parseInt(await getSetting("days_per_week", "6"), 10);
  res.json(GetWorkHoursResponse.parse({ hoursPerDay, daysPerWeek }));
});

router.put("/settings/work-hours", async (req, res): Promise<void> => {
  const parsed = UpdateWorkHoursBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await upsertSetting("hours_per_day", parsed.data.hoursPerDay.toString());
  await upsertSetting("days_per_week", parsed.data.daysPerWeek.toString());

  res.json(UpdateWorkHoursResponse.parse(parsed.data));
});

export default router;
