import type { Request, Response, NextFunction } from "express";
import type { TimerService } from "./timer.service";
import { sendOk } from "../../http/response";

export class TimerController {
  constructor(private svc: TimerService) {}

  start = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.start(req.auth!)); } catch (e) { next(e); }
  };
  active = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.getActive(req.auth!)); } catch (e) { next(e); }
  };
  finish = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.finish(req.auth!, req.body)); } catch (e) { next(e); }
  };
}
