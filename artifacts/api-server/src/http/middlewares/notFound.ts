import type { RequestHandler } from "express";
import { sendErr } from "../response";

export const notFound: RequestHandler = (_req, res) => {
  sendErr(res, "Rota não encontrada", 404);
};
