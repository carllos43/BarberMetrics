import crypto from "node:crypto";
import { z } from "zod";
import { logger } from "../lib/logger";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  CORS_ORIGINS: z.string().default(""),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
});

const parsed = EnvSchema.parse(process.env);

let jwtSecret = parsed.JWT_SECRET;
if (!jwtSecret) {
  if (parsed.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  jwtSecret = crypto.randomBytes(48).toString("hex");
  logger.warn(
    "JWT_SECRET not set, generated an ephemeral one for development. " +
      "Tokens will be invalidated on every server restart. " +
      "Set JWT_SECRET to a stable value to keep sessions across restarts.",
  );
}

export const env = {
  ...parsed,
  JWT_SECRET: jwtSecret,
};

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
