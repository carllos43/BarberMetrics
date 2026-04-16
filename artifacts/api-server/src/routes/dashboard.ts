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
  GetMonthlyAnalysisResponse,
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

const BR_TZ = "America/Sao_Paulo";
function currentMonthBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BR_TZ, year: "numeric", month: "2-digit" })
    .format(new Date()).substring(0, 7);
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

router.get("/dashboard/monthly-analysis", async (req, res): Promise<void> => {
  const month = (typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month))
    ? req.query.month
    : currentMonthBR();

  const monthStart = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, monthStart), lte(appointmentsTable.date, monthEnd)));

  // --- top days ---
  const dayMap = new Map<string, { earnings: number; count: number }>();
  for (const r of rows) {
    const e = parseFloat(r.barberEarnings as string) || 0;
    const existing = dayMap.get(r.date) || { earnings: 0, count: 0 };
    dayMap.set(r.date, { earnings: existing.earnings + e, count: existing.count + 1 });
  }
  const topDays = Array.from(dayMap.entries())
    .map(([date, d]) => ({ date, earnings: Math.round(d.earnings * 100) / 100, appointmentCount: d.count }))
    .sort((a, b) => b.earnings - a.earnings);

  const workedDays = dayMap.size;
  const totalEarnings = topDays.reduce((s, d) => s + d.earnings, 0);
  const dailyAverage = workedDays > 0 ? totalEarnings / workedDays : 0;

  // forecast: project daily avg to remaining working days in month
  const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: BR_TZ }).format(new Date());
  const isCurrentMonth = todayBR.startsWith(month);
  let monthlyForecast = totalEarnings;
  if (isCurrentMonth) {
    const todayDay = parseInt(todayBR.split("-")[2], 10);
    const remainingDays = lastDay - todayDay;
    // estimate remaining worked days proportionally
    const workDayRatio = workedDays / Math.max(1, todayDay);
    const projectedRemainingDays = remainingDays * workDayRatio;
    monthlyForecast = totalEarnings + dailyAverage * projectedRemainingDays;
  }
  monthlyForecast = Math.round(monthlyForecast * 100) / 100;

  // --- busiest hours ---
  const hourMap = new Map<number, number>();
  for (const r of rows) {
    const hour = parseInt((r.startTime || "0").split(":")[0], 10);
    if (!isNaN(hour)) hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  }
  const busiestHours = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  // --- weekday stats ---
  const wdMap = new Map<number, { earnings: number; count: number }>();
  for (const r of rows) {
    const [y, m, d] = r.date.split("-").map(Number);
    const wd = new Date(y, m - 1, d).getDay(); // 0=Sun
    const e = parseFloat(r.barberEarnings as string) || 0;
    const existing = wdMap.get(wd) || { earnings: 0, count: 0 };
    wdMap.set(wd, { earnings: existing.earnings + e, count: existing.count + 1 });
  }
  // count distinct days per weekday
  const wdDaysMap = new Map<number, Set<string>>();
  for (const r of rows) {
    const [y, m, d] = r.date.split("-").map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    if (!wdDaysMap.has(wd)) wdDaysMap.set(wd, new Set());
    wdDaysMap.get(wd)!.add(r.date);
  }
  const weekdayStats = Array.from(wdMap.entries())
    .map(([weekday, d]) => {
      const days = wdDaysMap.get(weekday)?.size || 1;
      return {
        weekday,
        dayName: DAY_NAMES[weekday],
        avgEarnings: Math.round((d.earnings / days) * 100) / 100,
        count: d.count,
      };
    })
    .sort((a, b) => b.avgEarnings - a.avgEarnings);

  // --- service ranking ---
  const svcMap = new Map<string, { count: number; earnings: number }>();
  for (const r of rows) {
    const svc = r.service || "Outro";
    const e = parseFloat(r.barberEarnings as string) || 0;
    const existing = svcMap.get(svc) || { count: 0, earnings: 0 };
    svcMap.set(svc, { count: existing.count + 1, earnings: existing.earnings + e });
  }
  const serviceRanking = Array.from(svcMap.entries())
    .map(([service, d]) => ({ service, count: d.count, totalEarnings: Math.round(d.earnings * 100) / 100 }))
    .sort((a, b) => b.count - a.count);

  res.json(GetMonthlyAnalysisResponse.parse({
    month,
    workedDays,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    monthlyForecast,
    topDays,
    busiestHours,
    weekdayStats,
    serviceRanking,
  }));
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
