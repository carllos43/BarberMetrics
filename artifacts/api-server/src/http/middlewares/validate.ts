import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { ValidationError } from "../../domain/errors";

export interface Schemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate = (s: Schemas): RequestHandler => (req, _res, next) => {
  try {
    if (s.body) req.body = s.body.parse(req.body);
    if (s.params) {
      const out = s.params.parse(req.params);
      Object.assign(req.params, out);
    }
    if (s.query) {
      const out = s.query.parse(req.query);
      // Express 5 makes req.query a getter on a frozen object; mutate in place when possible.
      try {
        Object.assign(req.query, out);
      } catch {
        // fall through; controllers that need parsed query can re-parse if needed
      }
    }
    next();
  } catch (e: any) {
    next(new ValidationError(e?.issues?.[0]?.message ?? e?.message ?? "Dados inválidos"));
  }
};
