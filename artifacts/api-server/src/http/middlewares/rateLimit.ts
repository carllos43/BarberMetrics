import rateLimit from "express-rate-limit";

export const globalRateLimit = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Muitas requisições, tente novamente em alguns instantes." },
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Muitas tentativas de autenticação, aguarde um momento." },
});
