import type { IncomingMessage, ServerResponse } from "node:http";
import { personalFinancesService } from "../../src/container";
import { logger } from "../../src/lib/logger";

/**
 * Vercel Cron entrypoint. Configurado em `vercel.json` para rodar
 * todo domingo às 01:00 UTC. A Vercel envia um header de assinatura
 * (Authorization: Bearer ${process.env.CRON_SECRET}) que validamos.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers["authorization"];

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        res.statusCode = 401;
        res.end("Unauthorized");
        return;
      }
    }

    const result = await personalFinancesService.autoCloseOverdueCycles(new Date());
    logger.info({ ...result }, "vercel cron: auto-closed overdue weekly cycles");

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (err) {
    logger.error({ err }, "vercel cron failed");
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
  }
}
