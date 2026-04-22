import type { Request, Response, NextFunction } from "express";
import type { DashboardService } from "./dashboard.service";
import { sendOk } from "../../http/response";

export class DashboardController {
  constructor(private svc: DashboardService) {}

  summary = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.summary(req.auth!)); } catch (e) { next(e); }
  };
  monthlyAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const month = typeof req.query.month === "string" ? req.query.month : undefined;
      sendOk(res, await this.svc.monthlyAnalysis(req.auth!, month));
    } catch (e) { next(e); }
  };
}
