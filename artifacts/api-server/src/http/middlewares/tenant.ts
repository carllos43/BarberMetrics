import type { RequestHandler } from "express";
import { ForbiddenError } from "../../domain/errors";

/**
 * Defense-in-depth: ensures every request reaching a tenant-scoped handler
 * has a barbershop context resolved by the auth layer. The current JWT
 * already carries `bsId`, so this middleware enforces the invariant rather
 * than performing a DB lookup. If/when we support multi-shop users, lookup
 * + selection would happen here.
 */
export const tenantMiddleware: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(new ForbiddenError("Contexto de autenticação ausente"));
  if (!req.auth.barbershopId) return next(new ForbiddenError("Usuário sem barbearia vinculada"));
  next();
};
