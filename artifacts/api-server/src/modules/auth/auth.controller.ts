import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { AuthService } from "./auth.service";
import { sendOk } from "../../http/response";

export const SignupBody = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128),
  fullName: z.string().min(2, "Nome obrigatório").max(80),
  barbershopName: z.string().max(80).optional(),
});

export const LoginBody = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1).max(128),
});

export class AuthController {
  constructor(private svc: AuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.signup(req.body), 201); } catch (e) { next(e); }
  };
  login = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.login(req.body)); } catch (e) { next(e); }
  };
  me = async (req: Request, res: Response, next: NextFunction) => {
    try { sendOk(res, await this.svc.me(req.auth!.userId)); } catch (e) { next(e); }
  };
}
