import type { AuthContext } from "../../http/middlewares/auth";
import type { AppointmentsRepo } from "../appointments/appointments.repository";
import type { BillsRepo } from "../bills/bills.repository";
import type { TimerRepo } from "../timer/timer.repository";
import type { SettingsService } from "../settings/settings.service";
import { toBRDateStr, currentMonthBR, BR_TZ, timeStrToMinutes } from "../../domain/time";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export class DashboardService {
  constructor(
    private appointments: AppointmentsRepo,
    private bills: BillsRepo,
    private timer: TimerRepo,
    private settings: SettingsService,
  ) {}

  async summary(ctx: AuthContext) {
    const today = toBRDateStr(new Date());

    const [todayAppointments, activeTimer, totalBills, dailyGoal] = await Promise.all([
      this.appointments.listByDateRange(ctx.barbershopId, today, today),
      this.timer.findActive(ctx.barbershopId, ctx.userId),
      this.bills.totalValue(ctx.barbershopId),
      this.settings.getDailyGoal(ctx),
    ]);

    const grossRevenue = todayAppointments.reduce((s, a) => s + a.value, 0);
    const barberEarnings = todayAppointments.reduce((s, a) => s + a.barberEarnings, 0);
    const totalServiceMinutes = todayAppointments.reduce((s, a) => s + a.durationMinutes, 0);
    const totalClients = todayAppointments.length;
    const avgDurationMinutes = totalClients > 0 ? totalServiceMinutes / totalClients : 0;
    const avgTicket = totalClients > 0 ? grossRevenue / totalClients : 0;

    let totalWorkingMinutes = 0;
    if (todayAppointments.length > 0) {
      const sorted = [...todayAppointments].sort((a, b) => timeStrToMinutes(a.startTime) - timeStrToMinutes(b.startTime));
      totalWorkingMinutes = Math.max(
        0,
        timeStrToMinutes(sorted[sorted.length - 1].endTime) - timeStrToMinutes(sorted[0].startTime),
      );
    }

    const attendingHours = totalServiceMinutes / 60;
    const earningsPerHour = attendingHours > 0 ? barberEarnings / attendingHours : 0;
    const chairValuePerHour = attendingHours > 0 ? grossRevenue / attendingHours : 0;
    const productivityPercent = totalWorkingMinutes > 0 ? (totalServiceMinutes / totalWorkingMinutes) * 100 : 0;
    const clientsPossible = avgDurationMinutes > 0 && totalWorkingMinutes > 0 ? totalWorkingMinutes / avgDurationMinutes : 0;
    const chairGoal = clientsPossible * avgTicket;
    const minimumDailyGoal = Math.ceil(totalBills / 22);
    const goalProgress = dailyGoal > 0 ? Math.min(100, (barberEarnings / dailyGoal) * 100) : 0;

    return {
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
      barberEarningsPerHour: earningsPerHour,
      totalWorkingMinutes,
      totalServiceMinutes,
    };
  }

  async monthlyAnalysis(ctx: AuthContext, month?: string) {
    const monthStr = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonthBR();
    const [year, mon] = monthStr.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const monthStart = `${monthStr}-01`;
    const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

    const rows = await this.appointments.listByDateRange(ctx.barbershopId, monthStart, monthEnd);

    const dayMap = new Map<string, { earnings: number; count: number }>();
    for (const r of rows) {
      const e = dayMap.get(r.date) ?? { earnings: 0, count: 0 };
      dayMap.set(r.date, { earnings: e.earnings + r.barberEarnings, count: e.count + 1 });
    }
    const topDays = [...dayMap.entries()]
      .map(([date, d]) => ({ date, earnings: Math.round(d.earnings * 100) / 100, appointmentCount: d.count }))
      .sort((a, b) => b.earnings - a.earnings);

    const workedDays = dayMap.size;
    const totalEarnings = topDays.reduce((s, d) => s + d.earnings, 0);
    const dailyAverage = workedDays > 0 ? totalEarnings / workedDays : 0;

    const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: BR_TZ }).format(new Date());
    const isCurrentMonth = todayBR.startsWith(monthStr);
    let monthlyForecast = totalEarnings;
    if (isCurrentMonth) {
      const todayDay = parseInt(todayBR.split("-")[2], 10);
      const remainingDays = lastDay - todayDay;
      const workDayRatio = workedDays / Math.max(1, todayDay);
      monthlyForecast = totalEarnings + dailyAverage * remainingDays * workDayRatio;
    }
    monthlyForecast = Math.round(monthlyForecast * 100) / 100;

    const hourMap = new Map<number, number>();
    for (const r of rows) {
      const h = parseInt(r.startTime.split(":")[0], 10);
      if (!isNaN(h)) hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
    }
    const busiestHours = [...hourMap.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    const wdMap = new Map<number, { earnings: number; count: number }>();
    const wdDaysMap = new Map<number, Set<string>>();
    for (const r of rows) {
      const [y, m, d] = r.date.split("-").map(Number);
      const wd = new Date(y, m - 1, d).getDay();
      const e = wdMap.get(wd) ?? { earnings: 0, count: 0 };
      wdMap.set(wd, { earnings: e.earnings + r.barberEarnings, count: e.count + 1 });
      if (!wdDaysMap.has(wd)) wdDaysMap.set(wd, new Set());
      wdDaysMap.get(wd)!.add(r.date);
    }
    const weekdayStats = [...wdMap.entries()]
      .map(([weekday, d]) => {
        const days = wdDaysMap.get(weekday)?.size ?? 1;
        return {
          weekday,
          dayName: DAY_NAMES[weekday],
          avgEarnings: Math.round((d.earnings / days) * 100) / 100,
          count: d.count,
        };
      })
      .sort((a, b) => b.avgEarnings - a.avgEarnings);

    const svcMap = new Map<string, { count: number; earnings: number }>();
    for (const r of rows) {
      const svc = r.service || "Outro";
      const e = svcMap.get(svc) ?? { count: 0, earnings: 0 };
      svcMap.set(svc, { count: e.count + 1, earnings: e.earnings + r.barberEarnings });
    }
    const serviceRanking = [...svcMap.entries()]
      .map(([service, d]) => ({ service, count: d.count, totalEarnings: Math.round(d.earnings * 100) / 100 }))
      .sort((a, b) => b.count - a.count);

    return {
      month: monthStr,
      workedDays,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      monthlyForecast,
      topDays,
      busiestHours,
      weekdayStats,
      serviceRanking,
    };
  }
}
