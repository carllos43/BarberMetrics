import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { PersonalFinancesService } from "./personalFinances.service";
import type { PersonalFinancesRepo } from "./personalFinances.repository";
import type { WeeklyCyclesRepo } from "../weeklyCycles/weeklyCycles.repository";
import { sendOk } from "../../http/response";

export const WithdrawalBody = z.object({
  valor: z.number().positive(),
  categoriaDestino: z.enum(["gasto_livre", "conta_fixa", "reserva"]),
  descricao: z.string().max(120).nullish(),
  occurredAt: z.string().datetime().optional(),
});
export const WithdrawalPatch = WithdrawalBody.partial();

export const PersonalFinancesPatch = z.object({
  saldoBanco: z.number().nonnegative().optional(),
  saldoGuardado: z.number().nonnegative().optional(),
  percentualCaixinha: z.number().int().min(0).max(100).optional(),
  limiteLazer: z.number().nonnegative().optional(),
  limiteComida: z.number().nonnegative().optional(),
  limiteOutros: z.number().nonnegative().optional(),
});

export const CloseWeekBody = z.object({ cycleId: z.number().int().positive() });

export class PersonalFinancesController {
  constructor(
    private svc: PersonalFinancesService,
    private finances: PersonalFinancesRepo,
    private cycles: WeeklyCyclesRepo,
  ) {}

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.svc.getOverview(auth.barbershopId, auth.userId));
    } catch (e) { next(e); }
  };

  cycles_list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const limit = Math.min(36, Number(req.query.limit ?? 12));
      sendOk(res, await this.cycles.list(auth.barbershopId, auth.userId, limit));
    } catch (e) { next(e); }
  };

  createWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const w = await this.svc.createWithdrawal(auth.barbershopId, auth.userId, req.body);
      sendOk(res, w, 201);
    } catch (e) { next(e); }
  };

  updateWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      const w = await this.svc.updateWithdrawal(auth.barbershopId, id, req.body);
      sendOk(res, w);
    } catch (e) { next(e); }
  };

  deleteWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      await this.svc.deleteWithdrawal(auth.barbershopId, id);
      res.status(204).end();
    } catch (e) { next(e); }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const r = await this.finances.update(auth.barbershopId, auth.userId, req.body);
      sendOk(res, r);
    } catch (e) { next(e); }
  };

  closeWeek = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const result = await this.svc.closeWeek(auth.barbershopId, auth.userId, req.body.cycleId);
      sendOk(res, result);
    } catch (e) { next(e); }
  };
}
