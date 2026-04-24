import { DrizzleUsersRepo } from "./modules/users/users.repository";
import { DrizzleMembershipsRepo } from "./modules/memberships/memberships.repository";
import { DrizzleAppointmentsRepo } from "./modules/appointments/appointments.repository";
import { DrizzleBillsRepo } from "./modules/bills/bills.repository";
import { DrizzleTimerRepo } from "./modules/timer/timer.repository";
import { DrizzleSettingsRepo } from "./modules/settings/settings.repository";
import { DrizzleWeeklyCyclesRepo } from "./modules/weeklyCycles/weeklyCycles.repository";
import { DrizzleWithdrawalsRepo } from "./modules/withdrawals/withdrawals.repository";
import { DrizzlePersonalFinancesRepo } from "./modules/personalFinances/personalFinances.repository";
import { DrizzlePersonalBillsRepo } from "./modules/personalBills/personalBills.repository";
import { DrizzlePersonalCategoriesRepo } from "./modules/personalCategories/personalCategories.repository";
import { DrizzleTransactionsRepo } from "./modules/transactions/transactions.repository";
import { PersonalFinancesService } from "./modules/personalFinances/personalFinances.service";
import { TransactionsService } from "./modules/transactions/transactions.service";
import { PersonalReportsService } from "./modules/personalReports/personalReports.service";
import { PersonalCategoriesController } from "./modules/personalCategories/personalCategories.controller";
import { TransactionsController } from "./modules/transactions/transactions.controller";
import { PersonalReportsController } from "./modules/personalReports/personalReports.controller";

import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";
import { AppointmentsService } from "./modules/appointments/appointments.service";
import { AppointmentsController } from "./modules/appointments/appointments.controller";
import { BillsService } from "./modules/bills/bills.service";
import { BillsController } from "./modules/bills/bills.controller";
import { TimerService } from "./modules/timer/timer.service";
import { TimerController } from "./modules/timer/timer.controller";
import { SettingsService } from "./modules/settings/settings.service";
import { SettingsController } from "./modules/settings/settings.controller";
import { DashboardService } from "./modules/dashboard/dashboard.service";
import { DashboardController } from "./modules/dashboard/dashboard.controller";
import { FinancesService } from "./modules/finances/finances.service";
import { FinancesController } from "./modules/finances/finances.controller";
import { ProductivityService } from "./modules/productivity/productivity.service";
import { ProductivityController } from "./modules/productivity/productivity.controller";
import { ReportsService } from "./modules/reports/reports.service";
import { ReportsController } from "./modules/reports/reports.controller";
import { PersonalFinancesController } from "./modules/personalFinances/personalFinances.controller";
import { PersonalBillsController } from "./modules/personalBills/personalBills.controller";

// ---- Repositories
export const usersRepo = new DrizzleUsersRepo();
export const membershipsRepo = new DrizzleMembershipsRepo();
export const appointmentsRepo = new DrizzleAppointmentsRepo();
export const billsRepo = new DrizzleBillsRepo();
export const timerRepo = new DrizzleTimerRepo();
export const settingsRepo = new DrizzleSettingsRepo();
export const weeklyCyclesRepo = new DrizzleWeeklyCyclesRepo();
export const withdrawalsRepo = new DrizzleWithdrawalsRepo();
export const personalFinancesRepo = new DrizzlePersonalFinancesRepo();
export const personalBillsRepo = new DrizzlePersonalBillsRepo();
export const personalCategoriesRepo = new DrizzlePersonalCategoriesRepo();
export const transactionsRepo = new DrizzleTransactionsRepo();

// ---- Services
export const settingsService = new SettingsService(settingsRepo, usersRepo);
export const authService = new AuthService(usersRepo, membershipsRepo);
export const appointmentsService = new AppointmentsService(appointmentsRepo, usersRepo);
export const billsService = new BillsService(billsRepo);
export const timerService = new TimerService(timerRepo, appointmentsRepo, usersRepo);
export const dashboardService = new DashboardService(appointmentsRepo, billsRepo, timerRepo, settingsService);
export const financesService = new FinancesService(appointmentsRepo, billsRepo);
export const productivityService = new ProductivityService(appointmentsRepo, billsRepo, settingsService);
export const reportsService = new ReportsService(appointmentsRepo);
export const transactionsService = new TransactionsService(transactionsRepo, personalCategoriesRepo, personalBillsRepo);
export const personalFinancesService = new PersonalFinancesService(
  weeklyCyclesRepo, withdrawalsRepo, personalFinancesRepo, personalBillsRepo,
  transactionsRepo, personalCategoriesRepo,
);
export const personalReportsService = new PersonalReportsService(transactionsRepo, personalCategoriesRepo, appointmentsRepo);
export const personalFinancesController = new PersonalFinancesController(
  personalFinancesService, personalFinancesRepo, weeklyCyclesRepo,
);
export const personalBillsController = new PersonalBillsController(personalBillsRepo);
export const personalCategoriesController = new PersonalCategoriesController(personalCategoriesRepo);
export const transactionsController = new TransactionsController(transactionsService);
export const personalReportsController = new PersonalReportsController(personalReportsService);

// ---- Controllers
export const authController = new AuthController(authService);
export const appointmentsController = new AppointmentsController(appointmentsService);
export const billsController = new BillsController(billsService);
export const timerController = new TimerController(timerService);
export const settingsController = new SettingsController(settingsService);
export const dashboardController = new DashboardController(dashboardService);
export const financesController = new FinancesController(financesService);
export const productivityController = new ProductivityController(productivityService);
export const reportsController = new ReportsController(reportsService);
