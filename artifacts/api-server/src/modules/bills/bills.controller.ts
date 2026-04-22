import type { Request, Response, NextFunction } from "express";
import type { BillsService } from "./bills.service";
import { sendOk, sendNoContent } from "../../http/response";

export class BillsController {
  constructor(private svc: BillsService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.list(req.auth!)); } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.create(req.auth!, req.body), 201); } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.update(req.auth!, Number(req.params.id), req.body)); } catch (e) { next(e); }
  };
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.svc.remove(req.auth!, Number(req.params.id)); sendNoContent(res); } catch (e) { next(e); }
  };
}
