import type { AuthContext } from "../../http/middlewares/auth";
import type { AppointmentsRepo, AppointmentDTO } from "./appointments.repository";
import type { UsersRepo } from "../users/users.repository";
import { NotFoundError } from "../../domain/errors";
import { getPeriodDates, nowBR, timeStrToMinutes } from "../../domain/time";

export interface CreateAppointmentInput {
  service: string;
  value: number;
  durationMinutes: number;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateAppointmentInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  service?: string;
  value?: number;
}

export class AppointmentsService {
  constructor(private repo: AppointmentsRepo, private users: UsersRepo) {}

  listForPeriod(ctx: AuthContext, period: string): Promise<AppointmentDTO[]> {
    const { start, end } = getPeriodDates(period);
    return this.repo.listByDateRange(ctx.barbershopId, start, end);
  }

  async create(ctx: AuthContext, input: CreateAppointmentInput): Promise<AppointmentDTO> {
    const { date, time } = nowBR();
    const commission = await this.users.getCommissionPercent(ctx.userId);
    const value = input.value;
    const barberEarnings = +(value * (commission / 100)).toFixed(2);
    return this.repo.create(ctx.barbershopId, {
      userId: ctx.userId,
      date: input.date ?? date,
      startTime: input.startTime ?? time,
      endTime: input.endTime ?? time,
      durationMinutes: input.durationMinutes,
      service: input.service,
      value,
      barberEarnings,
      valorBruto: value,
      comissaoPercentual: commission,
      valorLiquido: barberEarnings,
    });
  }

  async getById(ctx: AuthContext, id: number): Promise<AppointmentDTO> {
    const found = await this.repo.findById(ctx.barbershopId, id);
    if (!found) throw new NotFoundError("Atendimento não encontrado");
    return found;
  }

  async update(ctx: AuthContext, id: number, patch: UpdateAppointmentInput): Promise<AppointmentDTO> {
    const existing = await this.getById(ctx, id);
    const startTime = patch.startTime ?? existing.startTime;
    const endTime = patch.endTime ?? existing.endTime;
    const durationMinutes = Math.max(1, timeStrToMinutes(endTime) - timeStrToMinutes(startTime));
    const value = patch.value ?? existing.value;
    const commission = await this.users.getCommissionPercent(ctx.userId);
    const barberEarnings = +(value * (commission / 100)).toFixed(2);
    const updated = await this.repo.update(ctx.barbershopId, id, {
      date: patch.date ?? existing.date,
      startTime, endTime, durationMinutes,
      service: patch.service ?? existing.service,
      value,
      barberEarnings,
      valorBruto: value,
      comissaoPercentual: commission,
      valorLiquido: barberEarnings,
    });
    if (!updated) throw new NotFoundError("Atendimento não encontrado");
    return updated;
  }

  async remove(ctx: AuthContext, id: number): Promise<void> {
    await this.getById(ctx, id);
    await this.repo.delete(ctx.barbershopId, id);
  }
}
