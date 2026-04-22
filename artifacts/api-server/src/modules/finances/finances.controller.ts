import type { Request, Response, NextFunction } from "express";
import type { FinancesService } from "./finances.service";
import { sendOk } from "../../http/response";

export class FinancesController {
  constructor(private svc: FinancesService) {}

  summary = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.summary(req.auth!)); } catch (e) { next(e); }
  };
}
