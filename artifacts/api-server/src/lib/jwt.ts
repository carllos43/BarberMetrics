import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;          // user id
  email: string;
  bsId: string;         // barbershop id
  role: string;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_TTL_SECONDS,
  });
}

export function verifyJwt(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || !decoded || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as unknown as JwtPayload;
}
