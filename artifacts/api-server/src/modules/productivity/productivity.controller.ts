import type { Request, Response, NextFunction } from "express";
import type { ProductivityService } from "./productivity.service";
import { sendOk } from "../../http/response";

export class ProductivityController {
  constructor(private svc: ProductivityService) {}

  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as string | undefined) ?? "today";
      sendOk(res, await this.svc.stats(req.auth!, period));
    } catch (e) { next(e); }
  };
  tips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as string | undefined) ?? "week";
      sendOk(res, await this.svc.tips(req.auth!, period));
    } catch (e) { next(e); }
  };
}
