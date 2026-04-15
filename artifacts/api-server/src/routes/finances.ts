import { Router, type IRouter } from "express";
import { and, gte, lte, eq } from "drizzle-orm";
import { db, appointmentsTable, billsTable, settingsTable } from "@workspace/db";
import {
  GetFinancialSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/finances/summary", async (req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();
  const daysRemainingInMonth = daysInMonth - dayOfMonth;

  const monthStartStr = monthStart.toISOString().split("T")[0];
  const monthEndStr = monthEnd.toISOString().split("T")[0];

  // Get this month's appointments
  const monthAppointments = await db
    .select()
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.date, monthStartStr), lte(appointmentsTable.date, monthEndStr)));

  const currentMonthEarnings = monthAppointments.reduce((sum, a) => sum + parseFloat(a.barberEarnings), 0);

  // Get all bills
  const bills = await db.select().from(billsTable).orderBy(billsTable.dueDay);
  const totalBills = bills.reduce((sum, b) => sum + parseFloat(b.value), 0);

  const remainingAfterBills = currentMonthEarnings - totalBills;
  const billsShortfall = Math.max(0, totalBills - currentMonthEarnings);

  // Get work settings
  const [daysRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "days_per_week")).limit(1);
  const daysPerWeek = daysRow ? parseInt(daysRow.value, 10) : 6;

  // Calculate how much is needed to cover bills
  const needed = Math.max(0, totalBills - currentMonthEarnings);
  const weeklyGoal = daysRemainingInMonth > 0 ? (needed / daysRemainingInMonth) * 7 : 0;
  const dailyGoalRequired = daysRemainingInMonth > 0 ? needed / daysRemainingInMonth : 0;

  // Projection: avg daily earnings * remaining days
  const daysElapsed = dayOfMonth;
  const avgDailyEarnings = daysElapsed > 0 ? currentMonthEarnings / daysElapsed : 0;
  const projectedMonthlyEarnings = currentMonthEarnings + avgDailyEarnings * daysRemainingInMonth;
  const projectedAfterBills = projectedMonthlyEarnings - totalBills;

  const onTrack = projectedMonthlyEarnings >= totalBills;
  const dailyDeficit = !onTrack && daysRemainingInMonth > 0
    ? (totalBills - projectedMonthlyEarnings) / daysRemainingInMonth
    : null;

  const billsMapped = bills.map((b) => ({
    ...b,
    value: parseFloat(b.value),
  }));

  res.json(GetFinancialSummaryResponse.parse({
    currentMonthEarnings,
    totalBills,
    remainingAfterBills,
    billsShortfall,
    weeklyGoal,
    dailyGoalRequired,
    projectedMonthlyEarnings,
    projectedAfterBills,
    daysRemainingInMonth,
    billsList: billsMapped,
    onTrack,
    dailyDeficit,
  }));
});

export default router;
