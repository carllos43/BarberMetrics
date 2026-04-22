import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appointmentsRouter from "./appointments";
import timerRouter from "./timer";
import billsRouter from "./bills";
import dashboardRouter from "./dashboard";
import productivityRouter from "./productivity";
import financesRouter from "./finances";
import reportsRouter from "./reports";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Health check is public
router.use(healthRouter);

// All other routes require authentication
router.use(requireAuth);
router.use(appointmentsRouter);
router.use(timerRouter);
router.use(billsRouter);
router.use(dashboardRouter);
router.use(productivityRouter);
router.use(financesRouter);
router.use(reportsRouter);

export default router;
