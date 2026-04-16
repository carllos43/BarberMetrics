import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, appointmentsTable, timerSessionsTable, settingsTable, billsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetDailyGoalResponse,
  UpdateDailyGoalBody,
  UpdateDailyGoalResponse,
  GetWorkHoursResponse,
  UpdateWorkHoursBody,
  UpdateWorkHoursResponse,
  GetCommissionResponse,
  UpdateCommissionBody,
  UpdateCommissionResponse,
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
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);

  const [todayAppointments, timerResult, bills, dailyGoal] = await Promise.all([
    db.select().from(appointmentsTable).where(and(gte(appointmentsTable.date, today), lte(appointmentsTable.date, today))),
    db.select().from(timerSessionsTable).where(eq(timerSessionsTable.isActive, true)).limit(1),
    db.select().from(billsTable),
    getSetting("daily_goal", "200").then(parseFloat),
  ]);

  const [activeTimer] = timerResult;

  const grossRevenue = todayAppointments.reduce((sum, a) => sum + parseFloat(a.value), 0);
  const barberEarnings = todayAppointments.reduce((sum, a) => sum + parseFloat(a.barberEarnings), 0);
  const totalServiceMinutes = todayAppointments.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalClients = todayAppointments.length;
  const avgDurationMinutes = totalClients > 0 ? totalServiceMinutes / totalClients : 0;
  const avgTicket = totalClients > 0 ? grossRevenue / totalClients : 0;

  // Real working time: first startTime → last endTime
  let totalWorkingMinutes = 0;
  if (todayAppointments.length > 0) {
    const timeToMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
    const sorted = [...todayAppointments].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
    totalWorkingMinutes = Math.max(0, timeToMin(sorted[sorted.length - 1].endTime) - timeToMin(sorted[0].startTime));
  }

  const attendingHours = totalServiceMinutes / 60;
  const earningsPerHour = attendingHours > 0 ? barberEarnings / attendingHours : 0;
  const chairValuePerHour = attendingHours > 0 ? grossRevenue / attendingHours : 0;
  const barberEarningsPerHour = earningsPerHour;
  const productivityPercent = totalWorkingMinutes > 0 ? (totalServiceMinutes / totalWorkingMinutes) * 100 : 0;

  // Chair goal: capacity-based (how much could be earned if working time was fully used)
  const clientsPossible = avgDurationMinutes > 0 && totalWorkingMinutes > 0
    ? totalWorkingMinutes / avgDurationMinutes
    : 0;
  const chairGoal = clientsPossible * avgTicket;

  // Minimum daily goal from registered monthly bills
  const totalBillsValue = bills.reduce((sum, b) => sum + parseFloat(b.value), 0);
  const minimumDailyGoal = Math.ceil(totalBillsValue / 22);

  const goalProgress = dailyGoal > 0 ? Math.min(100, (barberEarnings / dailyGoal) * 100) : 0;

  res.json(GetDashboardSummaryResponse.parse({
    clientsToday: totalClients,
    grossRevenue,
    barberEarnings,
    avgDurationMinutes,
    earningsPerHour,
    dailyGoal,
    goalProgress,
    isTimerActive: !!activeTimer,
    timerStartedAt: activeTimer ? activeTimer.startedAt.toISOString() : null,
    minimumDailyGoal,
    chairGoal,
    productivityPercent,
    chairValuePerHour,
    barberEarningsPerHour,
    totalWorkingMinutes,
    totalServiceMinutes,
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

router.get("/settings/commission", async (req, res): Promise<void> => {
  const commissionPercent = parseFloat(await getSetting("commission_percent", "60"));
  res.json(GetCommissionResponse.parse({ commissionPercent }));
});

router.put("/settings/commission", async (req, res): Promise<void> => {
  const parsed = UpdateCommissionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await upsertSetting("commission_percent", parsed.data.commissionPercent.toString());
  res.json(UpdateCommissionResponse.parse({ commissionPercent: parsed.data.commissionPercent }));
});

export default router;
