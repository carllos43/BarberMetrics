import type { AuthContext } from "../../http/middlewares/auth";
import type { TimerRepo } from "./timer.repository";
import type { AppointmentsRepo } from "../appointments/appointments.repository";
import type { UsersRepo } from "../users/users.repository";
import { toBRDateStr, toBRTimeStr } from "../../domain/time";

export interface FinishTimerInput {
  service: string;
  customService?: string;
  value: number;
}

export class TimerService {
  constructor(
    private repo: TimerRepo,
    private appointments: AppointmentsRepo,
    private users: UsersRepo,
  ) {}

  async start(ctx: AuthContext) {
    const now = new Date();
    await this.repo.deactivateActive(ctx.barbershopId, ctx.userId, now);
    const s = await this.repo.create(ctx.barbershopId, ctx.userId, now);
    return {
      id: s.id.toString(),
      startedAt: s.startedAt.toISOString(),
      elapsedSeconds: 0,
      isActive: true,
    };
  }

  async getActive(ctx: AuthContext) {
    const s = await this.repo.findActive(ctx.barbershopId, ctx.userId);
    if (!s) {
      return { id: "", startedAt: new Date().toISOString(), elapsedSeconds: 0, isActive: false };
    }
    const elapsedSeconds = Math.floor((Date.now() - s.startedAt.getTime()) / 1000);
    return {
      id: s.id.toString(),
      startedAt: s.startedAt.toISOString(),
      elapsedSeconds,
      isActive: true,
    };
  }

  async finish(ctx: AuthContext, input: FinishTimerInput) {
    const session = await this.repo.findActive(ctx.barbershopId, ctx.userId);
    const now = new Date();
    const startedAt = session?.startedAt ?? now;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 60000));

    if (session) {
      await this.repo.deactivateById(session.id, now);
    }

    const service = input.customService && input.service === "outro" ? input.customService : input.service;
    const commission = await this.users.getCommissionPercent(ctx.userId);
    const value = input.value;
    const barberEarnings = +(value * (commission / 100)).toFixed(2);

    return this.appointments.create(ctx.barbershopId, {
      userId: ctx.userId,
      date: toBRDateStr(now),
      startTime: toBRTimeStr(startedAt),
      endTime: toBRTimeStr(now),
      durationMinutes,
      service,
      value,
      barberEarnings,
      valorBruto: value,
      comissaoPercentual: commission,
      valorLiquido: barberEarnings,
    });
  }
}
