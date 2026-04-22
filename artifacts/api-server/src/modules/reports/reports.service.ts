import type { AuthContext } from "../../http/middlewares/auth";
import type { AppointmentsRepo } from "../appointments/appointments.repository";

export class ReportsService {
  constructor(private appointments: AppointmentsRepo) {}

  async statement(ctx: AuthContext, start: string, end: string) {
    const rows = await this.appointments.listByDateRange(ctx.barbershopId, start, end);
    return rows.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      durationMinutes: a.durationMinutes,
      service: a.service,
      value: a.value,
      barberEarnings: a.barberEarnings,
      createdAt: a.createdAt,
    }));
  }
}
