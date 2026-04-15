import { Router, type IRouter } from "express";
import { and, gte, lte } from "drizzle-orm";
import { db, appointmentsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetProductivityStatsQueryParams,
  GetProductivityStatsResponse,
  GetProductivityTipsQueryParams,
  GetProductivityTipsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getPeriodDates(period: string): { start: string; end: string; daysInPeriod: number } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (period === "today") {
    return { start: today, end: today, daysInPeriod: 1 };
  } else if (period === "week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
      daysInPeriod: 7,
    };
  } else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      daysInPeriod: end.getDate(),
    };
  } else if (period === "year") {
    return {
      start: `${now.getFullYear()}-01-01`,
      end: `${now.getFullYear()}-12-31`,
      daysInPeriod: 365,
    };
  }
  return { start: today, end: today, daysInPeriod: 1 };
}

router.get("/productivity/stats", async (req, res): Promise<void> => {
  const query = GetProductivityStatsQueryParams.safeParse(req.query);
  const period = query.success ? (query.data.period ?? "today") : "today";
  const { start, end, daysInPeriod } = getPeriodDates(period);

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, start), lte(appointmentsTable.date, end)));

  const totalClients = appointments.length;
  const totalDuration = appointments.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalEarnings = appointments.reduce((sum, a) => sum + parseFloat(a.barberEarnings), 0);
  const avgDurationMinutes = totalClients > 0 ? totalDuration / totalClients : 0;

  // Get work hours setting
  const [hoursRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "hours_per_day")).limit(1);
  const hoursPerDay = hoursRow ? parseFloat(hoursRow.value) : 8;
  const totalWorkingMinutes = daysInPeriod * hoursPerDay * 60;
  const totalServiceMinutes = totalDuration;
  const idleMinutes = Math.max(0, totalWorkingMinutes - totalServiceMinutes);

  const earningsPerHour = totalDuration > 0 ? (totalEarnings / totalDuration) * 60 : 0;

  // Potential extra earnings if idle time was used
  const avgValuePerMin = totalDuration > 0 ? totalEarnings / totalDuration : 0;
  const potentialExtraEarnings = idleMinutes * avgValuePerMin;

  // Service breakdown
  const serviceMap: Record<string, { count: number; totalRevenue: number }> = {};
  for (const a of appointments) {
    const svc = a.service;
    if (!serviceMap[svc]) serviceMap[svc] = { count: 0, totalRevenue: 0 };
    serviceMap[svc].count++;
    serviceMap[svc].totalRevenue += parseFloat(a.value);
  }

  const serviceBreakdown = Object.entries(serviceMap)
    .map(([service, data]) => ({
      service,
      count: data.count,
      percentage: totalClients > 0 ? (data.count / totalClients) * 100 : 0,
      totalRevenue: data.totalRevenue,
      avgValue: data.count > 0 ? data.totalRevenue / data.count : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const dailyAvgClients = daysInPeriod > 0 ? totalClients / daysInPeriod : 0;

  res.json(GetProductivityStatsResponse.parse({
    period,
    totalClients,
    avgDurationMinutes,
    earningsPerHour,
    totalWorkingMinutes,
    totalServiceMinutes,
    idleMinutes,
    potentialExtraEarnings,
    serviceBreakdown,
    dailyAvgClients,
    totalEarnings,
  }));
});

router.get("/productivity/tips", async (req, res): Promise<void> => {
  const query = GetProductivityTipsQueryParams.safeParse(req.query);
  const period = query.success ? (query.data.period ?? "week") : "week";
  const { start, end, daysInPeriod } = getPeriodDates(period);

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, start), lte(appointmentsTable.date, end)));

  const tips: Array<{ id: string; type: string; message: string; impact: string | null }> = [];

  if (appointments.length === 0) {
    tips.push({
      id: "no-data",
      type: "idle",
      message: "Registre seus atendimentos para receber dicas personalizadas.",
      impact: null,
    });
    res.json(GetProductivityTipsResponse.parse(tips));
    return;
  }

  const totalClients = appointments.length;
  const totalDuration = appointments.reduce((sum, a) => sum + a.durationMinutes, 0);
  const avgDuration = totalDuration / totalClients;
  const totalEarnings = appointments.reduce((sum, a) => sum + parseFloat(a.barberEarnings), 0);

  const [hoursRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "hours_per_day")).limit(1);
  const hoursPerDay = hoursRow ? parseFloat(hoursRow.value) : 8;
  const totalWorkingMinutes = daysInPeriod * hoursPerDay * 60;
  const idleMinutes = Math.max(0, totalWorkingMinutes - totalDuration);

  // Time tip
  if (avgDuration > 22) {
    const excess = Math.round(avgDuration - 22);
    const extraClientsPerDay = Math.floor((hoursPerDay * 60) / 22) - Math.floor((hoursPerDay * 60) / avgDuration);
    const avgValue = totalEarnings / totalClients;
    const extraMonthly = extraClientsPerDay * avgValue * 26;
    tips.push({
      id: "time-reduction",
      type: "time",
      message: `Seu tempo médio foi de ${Math.round(avgDuration)} minutos. O ideal seria 22 minutos. Se reduzir ${excess} minutos por corte, você pode atender ${extraClientsPerDay} clientes a mais por dia.`,
      impact: `+R$${extraMonthly.toFixed(0)} por mês`,
    });
  }

  // Idle time tip
  if (idleMinutes > 60) {
    const idleHours = (idleMinutes / 60).toFixed(1);
    const avgValuePerClient = totalClients > 0 ? totalEarnings / totalClients : 30;
    const extraClients = Math.floor(idleMinutes / (avgDuration || 30));
    const potentialEarnings = extraClients * avgValuePerClient;
    tips.push({
      id: "idle-time",
      type: "idle",
      message: `Você ficou ${idleHours} horas sem atender clientes no período. Se tivesse atendido mais ${extraClients} clientes, poderia ganhar aproximadamente +R$${potentialEarnings.toFixed(0)}.`,
      impact: `+R$${potentialEarnings.toFixed(0)} potencial`,
    });
  }

  // Service tip — find best service by avg value
  const serviceMap: Record<string, { count: number; totalValue: number }> = {};
  for (const a of appointments) {
    const svc = a.service;
    if (!serviceMap[svc]) serviceMap[svc] = { count: 0, totalValue: 0 };
    serviceMap[svc].count++;
    serviceMap[svc].totalValue += parseFloat(a.value);
  }

  const services = Object.entries(serviceMap).map(([svc, data]) => ({
    service: svc,
    count: data.count,
    avgValue: data.totalValue / data.count,
  }));
  services.sort((a, b) => b.avgValue - a.avgValue);

  if (services.length > 1) {
    const best = services[0];
    const mostCommon = services.reduce((a, b) => (a.count > b.count ? a : b));
    if (best.service !== mostCommon.service) {
      const extraPerDay = 2;
      const extraMonthly = extraPerDay * best.avgValue * 0.6 * 26;
      tips.push({
        id: "service-upsell",
        type: "service",
        message: `O serviço "${best.service}" tem a melhor margem. Se vender ${extraPerDay} serviços a mais por dia, seu faturamento pode aumentar aproximadamente R$${extraMonthly.toFixed(0)} por mês.`,
        impact: `+R$${extraMonthly.toFixed(0)} por mês`,
      });
    }
  }

  // Revenue per hour tip
  const earningsPerHour = totalDuration > 0 ? (totalEarnings / totalDuration) * 60 : 0;
  if (earningsPerHour < 40) {
    tips.push({
      id: "revenue-per-hour",
      type: "revenue",
      message: `Seu rendimento está em R$${earningsPerHour.toFixed(0)}/hora. Reduzindo o tempo médio de corte ou aumentando o ticket médio, você pode melhorar esse valor.`,
      impact: null,
    });
  }

  res.json(GetProductivityTipsResponse.parse(tips));
});

export default router;
