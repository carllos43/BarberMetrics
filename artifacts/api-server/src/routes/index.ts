import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appointmentsRouter from "./appointments";
import timerRouter from "./timer";
import billsRouter from "./bills";
import dashboardRouter from "./dashboard";
import productivityRouter from "./productivity";
import financesRouter from "./finances";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appointmentsRouter);
router.use(timerRouter);
router.use(billsRouter);
router.use(dashboardRouter);
router.use(productivityRouter);
router.use(financesRouter);

export default router;
