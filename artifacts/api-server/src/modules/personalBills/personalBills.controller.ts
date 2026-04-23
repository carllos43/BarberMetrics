import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { PersonalBillsRepo } from "./personalBills.repository";
import { sendOk } from "../../http/response";
import { NotFoundError } from "../../domain/errors";

export const PersonalBillBody = z.object({
  nome: z.string().min(1).max(80),
  valor: z.number().positive(),
  diaVencimento: z.number().int().min(1).max(31),
  categoria: z.string().max(40).default("conta_fixa"),
  ativa: z.boolean().default(true),
});
export const PersonalBillPatch = PersonalBillBody.partial();

export class PersonalBillsController {
  constructor(private repo: PersonalBillsRepo) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.repo.list(auth.barbershopId, auth.userId));
    } catch (e) { next(e); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const r = await this.repo.create(auth.barbershopId, { userId: auth.userId, ...req.body });
      sendOk(res, r, 201);
    } catch (e) { next(e); }
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      const r = await this.repo.update(auth.barbershopId, id, req.body);
      if (!r) throw new NotFoundError("Conta não encontrada");
      sendOk(res, r);
    } catch (e) { next(e); }
  };
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      await this.repo.delete(auth.barbershopId, Number(req.params.id));
      res.status(204).end();
    } catch (e) { next(e); }
  };
}
