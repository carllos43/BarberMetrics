import type { Request, Response, NextFunction } from "express";
import type { SettingsService } from "./settings.service";
import { sendOk } from "../../http/response";

export class SettingsController {
  constructor(private svc: SettingsService) {}

  getDailyGoal = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, { goal: await this.svc.getDailyGoal(req.auth!) }); } catch (e) { next(e); }
  };
  updateDailyGoal = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.updateDailyGoal(req.auth!, req.body.goal)); } catch (e) { next(e); }
  };

  getWorkHours = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.getWorkHours(req.auth!)); } catch (e) { next(e); }
  };
  updateWorkHours = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.updateWorkHours(req.auth!, req.body)); } catch (e) { next(e); }
  };

  getCommission = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.getCommission(req.auth!)); } catch (e) { next(e); }
  };
  updateCommission = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.updateCommission(req.auth!, req.body.commissionPercent)); } catch (e) { next(e); }
  };
}
