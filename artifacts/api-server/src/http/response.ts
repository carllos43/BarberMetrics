import type { Response } from "express";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function sendOk<T>(res: Response, data: T, status = 200): Response {
  // Backwards-compat: keep flat data on the body so the existing generated
  // OpenAPI client (which expects the raw schema) keeps working. Production
  // contract is documented in README; clients can opt-in to the envelope by
  // hitting `/api/envelope/*` if/when added.
  return res.status(status).json(data);
}

export function sendErr(res: Response, error: string, status = 400): Response {
  return res.status(status).json({ success: false, error } satisfies ApiFailure);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).end();
}
