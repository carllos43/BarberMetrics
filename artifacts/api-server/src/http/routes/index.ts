import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  authController,
  appointmentsController,
  billsController,
  timerController,
  settingsController,
  dashboardController,
  financesController,
  productivityController,
  reportsController,
  personalFinancesController,
  personalBillsController,
} from "../../container";
import {
  WithdrawalBody, WithdrawalPatch, PersonalFinancesPatch, CloseWeekBody,
} from "../../modules/personalFinances/personalFinances.controller";
import {
  PersonalBillBody, PersonalBillPatch,
} from "../../modules/personalBills/personalBills.controller";
import { authMiddleware, authOnlyMiddleware } from "../middlewares/auth";
import { tenantMiddleware } from "../middlewares/tenant";
import { authRateLimit } from "../middlewares/rateLimit";
import { validate } from "../middlewares/validate";
import { OnboardBody } from "../../modules/auth/auth.controller";

const router: IRouter = Router();

// ----- Health (public)
router.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// ----- Auth — login/signup happen on Supabase directly via the browser SDK.
// The backend only handles the post-signup onboarding (creating the
// barbershop + profile + membership) and returning the session payload.
const authRouter: IRouter = Router();
authRouter.post("/onboard", authRateLimit, authOnlyMiddleware, validate({ body: OnboardBody }), authController.onboard);
authRouter.get("/me", authMiddleware, authController.me);
router.use("/auth", authRouter);

// ----- Protected: everything below requires auth + tenant
const protectedRouter: IRouter = Router();
protectedRouter.use(authMiddleware, tenantMiddleware);

// Appointments
const AppointmentBody = z.object({
  service: z.string().min(1),
  value: z.number().positive(),
  durationMinutes: z.number().int().positive(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});
const AppointmentPatch = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  service: z.string().optional(),
  value: z.number().positive().optional(),
});
protectedRouter.get("/appointments", appointmentsController.list);
protectedRouter.post("/appointments", validate({ body: AppointmentBody }), appointmentsController.create);
protectedRouter.get("/appointments/:id", appointmentsController.get);
protectedRouter.patch("/appointments/:id", validate({ body: AppointmentPatch }), appointmentsController.update);
protectedRouter.delete("/appointments/:id", appointmentsController.remove);

// Bills
const BillBody = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  category: z.string().optional(),
});
const BillPatch = BillBody.partial();
protectedRouter.get("/bills", billsController.list);
protectedRouter.post("/bills", validate({ body: BillBody }), billsController.create);
protectedRouter.patch("/bills/:id", validate({ body: BillPatch }), billsController.update);
protectedRouter.delete("/bills/:id", billsController.remove);

// Timer
const FinishTimerBody = z.object({
  service: z.string().min(1),
  customService: z.string().optional(),
  value: z.number().positive(),
});
protectedRouter.post("/timer/start", timerController.start);
protectedRouter.get("/timer/active", timerController.active);
protectedRouter.post("/timer/finish", validate({ body: FinishTimerBody }), timerController.finish);

// Dashboard
protectedRouter.get("/dashboard/summary", dashboardController.summary);
protectedRouter.get("/dashboard/monthly-analysis", dashboardController.monthlyAnalysis);

// Finances
protectedRouter.get("/finances/summary", financesController.summary);

// Productivity
protectedRouter.get("/productivity/stats", productivityController.stats);
protectedRouter.get("/productivity/tips", productivityController.tips);

// Reports
protectedRouter.get("/reports/statement", reportsController.statement);

// Settings
protectedRouter.get("/settings/daily-goal", settingsController.getDailyGoal);
protectedRouter.put("/settings/daily-goal",
  validate({ body: z.object({ goal: z.number().positive() }) }),
  settingsController.updateDailyGoal);

protectedRouter.get("/settings/work-hours", settingsController.getWorkHours);
protectedRouter.put("/settings/work-hours",
  validate({ body: z.object({ hoursPerDay: z.number().positive(), daysPerWeek: z.number().int().min(1).max(7) }) }),
  settingsController.updateWorkHours);

protectedRouter.get("/settings/commission", settingsController.getCommission);
protectedRouter.put("/settings/commission",
  validate({ body: z.object({ commissionPercent: z.number().min(0).max(100) }) }),
  settingsController.updateCommission);

// Personal Finances (módulo financeiro pessoal — Fase 2)
protectedRouter.get("/personal-finances/overview", personalFinancesController.overview);
protectedRouter.get("/personal-finances/cycles", personalFinancesController.cycles_list);
protectedRouter.put("/personal-finances/settings",
  validate({ body: PersonalFinancesPatch }), personalFinancesController.updateSettings);
protectedRouter.post("/personal-finances/withdrawals",
  validate({ body: WithdrawalBody }), personalFinancesController.createWithdrawal);
protectedRouter.put("/personal-finances/withdrawals/:id",
  validate({ body: WithdrawalPatch }), personalFinancesController.updateWithdrawal);
protectedRouter.delete("/personal-finances/withdrawals/:id", personalFinancesController.deleteWithdrawal);
protectedRouter.post("/personal-finances/close-week",
  validate({ body: CloseWeekBody }), personalFinancesController.closeWeek);

// Personal Bills (contas pessoais fixas — semáforo)
protectedRouter.get("/personal-bills", personalBillsController.list);
protectedRouter.post("/personal-bills",
  validate({ body: PersonalBillBody }), personalBillsController.create);
protectedRouter.put("/personal-bills/:id",
  validate({ body: PersonalBillPatch }), personalBillsController.update);
protectedRouter.delete("/personal-bills/:id", personalBillsController.remove);

router.use(protectedRouter);

export default router;
