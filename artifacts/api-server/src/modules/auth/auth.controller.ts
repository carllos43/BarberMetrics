import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { AuthService } from "./auth.service";
import { sendOk } from "../../http/response";

export const OnboardBody = z.object({
  fullName: z.string().min(2, "Nome obrigatório").max(80),
  barbershopName: z.string().max(80).optional(),
});

export class AuthController {
  constructor(private svc: AuthService) {}

  onboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.svc.onboard({ id: auth.userId, email: auth.email }, req.body), 201);
    } catch (e) { next(e); }
  };
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      sendOk(res, await this.svc.me({ id: auth.userId, email: auth.email }));
    } catch (e) { next(e); }
  };
}
