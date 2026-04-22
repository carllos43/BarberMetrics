import type { AuthContext } from "../../http/middlewares/auth";
import type { AppointmentsRepo, AppointmentDTO } from "../appointments/appointments.repository";
import type { BillsRepo } from "../bills/bills.repository";
import type { SettingsService } from "../settings/settings.service";
import { getPeriodDates, timeStrToMinutes } from "../../domain/time";

function calcWorkingMinutes(apts: { startTime: string; endTime: string }[]): number {
  if (apts.length === 0) return 0;
  const sorted = [...apts].sort((a, b) => timeStrToMinutes(a.startTime) - timeStrToMinutes(b.startTime));
  return Math.max(0, timeStrToMinutes(sorted[sorted.length - 1].endTime) - timeStrToMinutes(sorted[0].startTime));
}

export class ProductivityService {
  constructor(
    private appointments: AppointmentsRepo,
    private bills: BillsRepo,
    private settings: SettingsService,
  ) {}

  async stats(ctx: AuthContext, period: string) {
    const { start, end, daysInPeriod } = getPeriodDates(period);

    const [apts, totalBillsValue] = await Promise.all([
      this.appointments.listByDateRange(ctx.barbershopId, start, end),
      this.bills.totalValue(ctx.barbershopId),
    ]);

    const totalClients = apts.length;
    const totalServiceMinutes = apts.reduce((s, a) => s + a.durationMinutes, 0);
    const totalEarnings = apts.reduce((s, a) => s + a.barberEarnings, 0);
    const grossRevenue = apts.reduce((s, a) => s + a.value, 0);
    const avgDurationMinutes = totalClients > 0 ? totalServiceMinutes / totalClients : 0;
    const avgTicket = totalClients > 0 ? grossRevenue / totalClients : 0;

    let totalWorkingMinutes = 0;
    if (period === "today") {
      totalWorkingMinutes = calcWorkingMinutes(apts);
    } else {
      const byDate: Record<string, { startTime: string; endTime: string }[]> = {};
      for (const a of apts) (byDate[a.date] ||= []).push({ startTime: a.startTime, endTime: a.endTime });
      for (const day of Object.values(byDate)) totalWorkingMinutes += calcWorkingMinutes(day);
    }

    const idleMinutes = Math.max(0, totalWorkingMinutes - totalServiceMinutes);
    const productivityPercent = totalWorkingMinutes > 0 ? (totalServiceMinutes / totalWorkingMinutes) * 100 : 0;
    const attendingHours = totalServiceMinutes / 60;
    const earningsPerHour = attendingHours > 0 ? totalEarnings / attendingHours : 0;
    const chairValuePerHour = attendingHours > 0 ? grossRevenue / attendingHours : 0;
    const clientsPossible = avgDurationMinutes > 0 ? totalWorkingMinutes / avgDurationMinutes : 0;
    const chairGoal = clientsPossible * avgTicket;
    const minimumDailyGoal = Math.ceil(totalBillsValue / 22);
    const avgValuePerMin = totalServiceMinutes > 0 ? totalEarnings / totalServiceMinutes : 0;
    const potentialExtraEarnings = idleMinutes * avgValuePerMin;

    const serviceMap: Record<string, { count: number; totalRevenue: number }> = {};
    for (const a of apts) {
      const e = (serviceMap[a.service] ||= { count: 0, totalRevenue: 0 });
      e.count++; e.totalRevenue += a.value;
    }
    const serviceBreakdown = Object.entries(serviceMap).map(([service, data]) => ({
      service,
      count: data.count,
      percentage: totalClients > 0 ? (data.count / totalClients) * 100 : 0,
      totalRevenue: data.totalRevenue,
      avgValue: data.count > 0 ? data.totalRevenue / data.count : 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      period,
      totalClients,
      avgDurationMinutes,
      earningsPerHour,
      totalWorkingMinutes,
      totalServiceMinutes,
      idleMinutes,
      grossRevenue,
      productivityPercent,
      chairValuePerHour,
      barberEarningsPerHour: earningsPerHour,
      chairGoal,
      minimumDailyGoal,
      potentialExtraEarnings,
      serviceBreakdown,
      dailyAvgClients: daysInPeriod > 0 ? totalClients / daysInPeriod : 0,
      totalEarnings,
    };
  }

  async tips(ctx: AuthContext, period: string) {
    const { start, end, daysInPeriod } = getPeriodDates(period);
    const apts = await this.appointments.listByDateRange(ctx.barbershopId, start, end);
    const tips: Array<{ id: string; type: string; message: string; impact: string | null }> = [];

    if (apts.length === 0) {
      tips.push({
        id: "no-data", type: "idle",
        message: "Registre seus atendimentos para receber dicas personalizadas.",
        impact: null,
      });
      return tips;
    }

    const totalClients = apts.length;
    const totalDuration = apts.reduce((s, a) => s + a.durationMinutes, 0);
    const avgDuration = totalDuration / totalClients;
    const totalEarnings = apts.reduce((s, a) => s + a.barberEarnings, 0);
    const hoursPerDay = await this.settings.getNumber(ctx, "hours_per_day", 8);
    const totalWorkingMinutes = daysInPeriod * hoursPerDay * 60;
    const idleMinutes = Math.max(0, totalWorkingMinutes - totalDuration);

    if (avgDuration > 22) {
      const excess = Math.round(avgDuration - 22);
      const extraClientsPerDay = Math.floor((hoursPerDay * 60) / 22) - Math.floor((hoursPerDay * 60) / avgDuration);
      const avgValue = totalEarnings / totalClients;
      const extraMonthly = extraClientsPerDay * avgValue * 26;
      tips.push({
        id: "time-reduction", type: "time",
        message: `Seu tempo médio foi de ${Math.round(avgDuration)} minutos. O ideal seria 22 minutos. Se reduzir ${excess} minutos por corte, você pode atender ${extraClientsPerDay} clientes a mais por dia.`,
        impact: `+R$${extraMonthly.toFixed(0)} por mês`,
      });
    }

    if (idleMinutes > 60) {
      const idleHours = (idleMinutes / 60).toFixed(1);
      const avgValuePerClient = totalClients > 0 ? totalEarnings / totalClients : 30;
      const extraClients = Math.floor(idleMinutes / (avgDuration || 30));
      const potentialEarnings = extraClients * avgValuePerClient;
      tips.push({
        id: "idle-time", type: "idle",
        message: `Você ficou ${idleHours} horas sem atender clientes no período. Se tivesse atendido mais ${extraClients} clientes, poderia ganhar aproximadamente +R$${potentialEarnings.toFixed(0)}.`,
        impact: `+R$${potentialEarnings.toFixed(0)} potencial`,
      });
    }

    const svcMap: Record<string, { count: number; totalValue: number }> = {};
    for (const a of apts) {
      const e = (svcMap[a.service] ||= { count: 0, totalValue: 0 });
      e.count++; e.totalValue += a.value;
    }
    const services = Object.entries(svcMap)
      .map(([service, d]) => ({ service, count: d.count, avgValue: d.totalValue / d.count }))
      .sort((a, b) => b.avgValue - a.avgValue);

    if (services.length > 1) {
      const best = services[0];
      const mostCommon = services.reduce((a, b) => (a.count > b.count ? a : b));
      if (best.service !== mostCommon.service) {
        const extraPerDay = 2;
        const extraMonthly = extraPerDay * best.avgValue * 0.6 * 26;
        tips.push({
          id: "service-upsell", type: "service",
          message: `O serviço "${best.service}" tem a melhor margem. Se vender ${extraPerDay} serviços a mais por dia, seu faturamento pode aumentar aproximadamente R$${extraMonthly.toFixed(0)} por mês.`,
          impact: `+R$${extraMonthly.toFixed(0)} por mês`,
        });
      }
    }

    const earningsPerHour = totalDuration > 0 ? (totalEarnings / totalDuration) * 60 : 0;
    if (earningsPerHour < 40) {
      tips.push({
        id: "revenue-per-hour", type: "revenue",
        message: `Seu rendimento está em R$${earningsPerHour.toFixed(0)}/hora. Reduzindo o tempo médio de corte ou aumentando o ticket médio, você pode melhorar esse valor.`,
        impact: null,
      });
    }

    return tips;
  }
}

// Suppress unused-import lint if AppointmentDTO is needed elsewhere later
export type { AppointmentDTO };
