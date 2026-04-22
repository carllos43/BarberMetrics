import type { ErrorRequestHandler } from "express";
import { DomainError } from "../../domain/errors";
import { sendErr } from "../response";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof DomainError) {
    return sendErr(res, err.message, err.status);
  }
  req.log?.error({ err }, "unhandled error");
  return sendErr(res, "Erro interno do servidor", 500);
};
