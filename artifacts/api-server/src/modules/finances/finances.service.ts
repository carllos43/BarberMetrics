import type { AuthContext } from "../../http/middlewares/auth";
import type { AppointmentsRepo } from "../appointments/appointments.repository";
import type { BillsRepo } from "../bills/bills.repository";

export class FinancesService {
  constructor(private appointments: AppointmentsRepo, private bills: BillsRepo) {}

  async summary(ctx: AuthContext) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const dayOfMonth = now.getDate();
    const daysRemainingInMonth = daysInMonth - dayOfMonth;

    const monthStartStr = monthStart.toISOString().split("T")[0];
    const monthEndStr = monthEnd.toISOString().split("T")[0];

    const [monthAppointments, billsList] = await Promise.all([
      this.appointments.listByDateRange(ctx.barbershopId, monthStartStr, monthEndStr),
      this.bills.list(ctx.barbershopId),
    ]);

    const currentMonthEarnings = monthAppointments.reduce((s, a) => s + a.barberEarnings, 0);
    const totalBills = billsList.reduce((s, b) => s + b.value, 0);
    const remainingAfterBills = currentMonthEarnings - totalBills;
    const billsShortfall = Math.max(0, totalBills - currentMonthEarnings);

    const needed = Math.max(0, totalBills - currentMonthEarnings);
    const weeklyGoal = daysRemainingInMonth > 0 ? (needed / daysRemainingInMonth) * 7 : 0;
    const dailyGoalRequired = daysRemainingInMonth > 0 ? needed / daysRemainingInMonth : 0;

    const daysElapsed = dayOfMonth;
    const avgDailyEarnings = daysElapsed > 0 ? currentMonthEarnings / daysElapsed : 0;
    const projectedMonthlyEarnings = currentMonthEarnings + avgDailyEarnings * daysRemainingInMonth;
    const projectedAfterBills = projectedMonthlyEarnings - totalBills;
    const onTrack = projectedMonthlyEarnings >= totalBills;
    const dailyDeficit = !onTrack && daysRemainingInMonth > 0
      ? (totalBills - projectedMonthlyEarnings) / daysRemainingInMonth
      : null;

    return {
      currentMonthEarnings,
      totalBills,
      remainingAfterBills,
      billsShortfall,
      weeklyGoal,
      dailyGoalRequired,
      projectedMonthlyEarnings,
      projectedAfterBills,
      daysRemainingInMonth,
      billsList,
      onTrack,
      dailyDeficit,
    };
  }
}
