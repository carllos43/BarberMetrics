import type { Request, Response, NextFunction } from "express";
import type { ReportsService } from "./reports.service";
import { sendOk } from "../../http/response";

export class ReportsController {
  constructor(private svc: ReportsService) {}

  statement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const start = String(req.query.start ?? "");
      const end = String(req.query.end ?? "");
      sendOk(res, await this.svc.statement(req.auth!, start, end));
    } catch (e) { next(e); }
  };
}
