import type { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError } from "../../domain/errors";
import { verifySupabaseToken } from "../../lib/supabase";
import { membershipsRepo } from "../../container";

export interface AuthContext {
  userId: string;
  email: string;
  barbershopId: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      userId?: string;
    }
  }
}

/**
 * Auth-only middleware: validates a Supabase JWT. Does NOT enforce
 * tenant linkage — used by /auth/onboard before the user has a
 * barbershop. Most routes use `authMiddleware` (below) which also
 * resolves the barbershop.
 */
export const authOnlyMiddleware: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) throw new UnauthorizedError("Token ausente");

    const u = await verifySupabaseToken(token);
    if (!u) throw new UnauthorizedError("Token inválido ou expirado");

    req.auth = { userId: u.id, email: u.email, barbershopId: "", role: "" };
    req.userId = u.id;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Standard middleware: validates token AND resolves the user's barbershop.
 */
export const authMiddleware: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) throw new UnauthorizedError("Token ausente");

    const u = await verifySupabaseToken(token);
    if (!u) throw new UnauthorizedError("Token inválido ou expirado");

    const m = await membershipsRepo.findActiveForUser(u.id);
    if (!m) throw new UnauthorizedError("Usuário sem barbearia vinculada (faça o onboarding)");

    req.auth = { userId: u.id, email: u.email, barbershopId: m.barbershopId, role: m.role };
    req.userId = u.id;
    next();
  } catch (err) {
    next(err);
  }
};
