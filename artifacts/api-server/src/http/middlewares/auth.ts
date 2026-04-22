import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyJwt, type JwtPayload } from "../../lib/jwt";
import { UnauthorizedError } from "../../domain/errors";

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
      // legacy alias still referenced by older code paths (kept for safety)
      userId?: string;
    }
  }
}

export const authMiddleware: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    if (!token) throw new UnauthorizedError("Token ausente");

    let payload: JwtPayload;
    try {
      payload = verifyJwt(token);
    } catch {
      throw new UnauthorizedError("Token inválido ou expirado");
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      barbershopId: payload.bsId,
      role: payload.role,
    };
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
};
