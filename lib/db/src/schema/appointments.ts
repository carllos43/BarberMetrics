import { pgTable, serial, text, integer, numeric, date, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

export const appointmentsTable = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    service: text("service").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    barberEarnings: numeric("barber_earnings", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsDateIdx: index("appointments_bs_date_idx").on(t.barbershopId, t.date),
    bsUserIdx: index("appointments_bs_user_idx").on(t.barbershopId, t.userId),
  }),
);

export type Appointment = typeof appointmentsTable.$inferSelect;
