import { logger } from "./logger";
import { personalFinancesService } from "../container";

const HOUR_MS = 60 * 60 * 1000;

let lastRunDate = "";

/** Roda o auto-fechamento todo domingo (UTC). Verifica a cada hora. */
async function tick() {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (lastRunDate === today) return;
    if (now.getUTCDay() !== 0) return; // só domingo
    lastRunDate = today;
    const r = await personalFinancesService.autoCloseOverdueCycles(now);
    if (r.processed > 0) {
      logger.info({ processed: r.processed, closed: r.closed.length }, "auto-closed overdue weekly cycles");
    }
  } catch (err) {
    logger.error({ err }, "scheduler tick failed");
  }
}

export function startScheduler() {
  // primeiro tick em 5s pra cobrir o caso de boot já em domingo
  setTimeout(() => { void tick(); }, 5_000);
  setInterval(() => { void tick(); }, HOUR_MS);
  logger.info("weekly-cycle scheduler started");
}
