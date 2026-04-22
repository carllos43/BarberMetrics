import type { Request, Response, NextFunction } from "express";
import type { AppointmentsService } from "./appointments.service";
import { sendOk, sendNoContent } from "../../http/response";

export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as string | undefined) ?? "today";
      sendOk(res, await this.svc.listForPeriod(req.auth!, period));
    } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.create(req.auth!, req.body), 201); } catch (e) { next(e); }
  };
  get = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.getById(req.auth!, Number(req.params.id))); } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.update(req.auth!, Number(req.params.id), req.body)); } catch (e) { next(e); }
  };
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.remove(req.auth!, Number(req.params.id)); sendNoContent(res); } catch (e) { next(e); }
  };
}
