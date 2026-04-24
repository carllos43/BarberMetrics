import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { PersonalReportsService } from "./personalReports.service";
import { sendOk } from "../../http/response";
import { ValidationError } from "../../domain/errors";

export const ReportQuery = z.object({
  start: z.string().min(8),
  end: z.string().min(8),
});

export class PersonalReportsController {
  constructor(private svc: PersonalReportsService) {}

  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const q = ReportQuery.parse(req.query);
      const startISO = `${q.start.slice(0, 10)}T00:00:00.000Z`;
      const endISO = `${q.end.slice(0, 10)}T23:59:59.999Z`;
      if (new Date(startISO) > new Date(endISO)) throw new ValidationError("Início > fim");
      sendOk(res, await this.svc.generate(auth.barbershopId, auth.userId, startISO, endISO));
    } catch (e) { next(e); }
  };
}
