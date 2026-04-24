import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { TransactionsService } from "./transactions.service";
import { sendOk } from "../../http/response";

export const TxCreateBody = z.object({
  type: z.enum(["entrada", "gasto", "pagamento"]),
  amount: z.number().positive(),
  categoryId: z.number().int().positive().nullish(),
  billId: z.number().int().positive().nullish(),
  description: z.string().max(160).nullish(),
  occurredAt: z.string().datetime().optional(),
});
export const TxPatch = z.object({
  type: z.enum(["entrada", "gasto", "pagamento"]).optional(),
  amount: z.number().positive().optional(),
  categoryId: z.number().int().positive().nullish(),
  billId: z.number().int().positive().nullish(),
  description: z.string().max(160).nullish(),
  occurredAt: z.string().datetime().optional(),
});

export const PayBillBody = z.object({
  billId: z.number().int().positive(),
  amount: z.number().positive(),
  description: z.string().max(160).nullish(),
  occurredAt: z.string().datetime().optional(),
});

export class TransactionsController {
  constructor(private svc: TransactionsService) {}

  cards = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.svc.listCategoriesWithBalance(auth.barbershopId, auth.userId));
    } catch (e) { next(e); }
  };

  extract = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.categoryId);
      sendOk(res, await this.svc.listExtract(auth.barbershopId, auth.userId, id));
    } catch (e) { next(e); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const body = req.body as z.infer<typeof TxCreateBody>;
      const tx = await this.svc.createTx(auth.barbershopId, {
        userId: auth.userId,
        type: body.type,
        amount: body.amount,
        categoryId: body.categoryId ?? null,
        billId: body.billId ?? null,
        description: body.description ?? null,
        occurredAt: body.occurredAt,
      });
      sendOk(res, tx, 201);
    } catch (e) { next(e); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      sendOk(res, await this.svc.updateTx(auth.barbershopId, id, req.body));
    } catch (e) { next(e); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const id = Number(req.params.id);
      await this.svc.deleteTx(auth.barbershopId, id);
      res.status(204).end();
    } catch (e) { next(e); }
  };

  payBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.svc.payBill(auth.barbershopId, auth.userId, req.body), 201);
    } catch (e) { next(e); }
  };
}
