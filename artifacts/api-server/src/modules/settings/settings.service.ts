import type { AuthContext } from "../../http/middlewares/auth";
import type { SettingsRepo } from "./settings.repository";
import type { UsersRepo } from "../users/users.repository";

export class SettingsService {
  constructor(private repo: SettingsRepo, private users: UsersRepo) {}

  async getNumber(ctx: AuthContext, key: string, defaultValue: number): Promise<number> {
    const v = await this.repo.get(ctx.barbershopId, ctx.userId, key);
    if (v === null) return defaultValue;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : defaultValue;
  }
  async setNumber(ctx: AuthContext, key: string, value: number) {
    await this.repo.upsert(ctx.barbershopId, ctx.userId, key, value.toString());
  }

  // ---- Daily goal ----
  getDailyGoal(ctx: AuthContext) { return this.getNumber(ctx, "daily_goal", 200); }
  async updateDailyGoal(ctx: AuthContext, goal: number) {
    await this.setNumber(ctx, "daily_goal", goal);
    return { goal };
  }

  // ---- Work hours ----
  async getWorkHours(ctx: AuthContext) {
    return {
      hoursPerDay: await this.getNumber(ctx, "hours_per_day", 8),
      daysPerWeek: Math.round(await this.getNumber(ctx, "days_per_week", 6)),
    };
  }
  async updateWorkHours(ctx: AuthContext, input: { hoursPerDay: number; daysPerWeek: number }) {
    await this.setNumber(ctx, "hours_per_day", input.hoursPerDay);
    await this.setNumber(ctx, "days_per_week", input.daysPerWeek);
    return input;
  }

  // ---- Commission (lives on user) ----
  async getCommission(ctx: AuthContext) {
    return { commissionPercent: await this.users.getCommissionPercent(ctx.userId) };
  }
  async updateCommission(ctx: AuthContext, commissionPercent: number) {
    await this.users.updateCommissionPercent(ctx.userId, commissionPercent);
    return { commissionPercent: Math.round(commissionPercent) };
  }
}
