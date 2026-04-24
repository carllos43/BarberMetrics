import { pgTable, serial, text, numeric, date, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

/**
 * Ciclo semanal de produção (Segunda → Sábado).
 * `saldoProduzido` = soma de `valorLiquido` dos appointments do ciclo.
 * `totalVales` = soma das withdrawals do ciclo.
 * Sábado à noite o ciclo é fechado e o saldo migra pra aba pessoal.
 */
export const weeklyCyclesTable = pgTable(
  "weekly_cycles",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    saldoProduzido: numeric("saldo_produzido", { precision: 12, scale: 2 }).notNull().default("0"),
    totalVales: numeric("total_vales", { precision: 12, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsUserIdx: index("weekly_cycles_bs_user_idx").on(t.barbershopId, t.userId),
    bsRangeIdx: index("weekly_cycles_bs_range_idx").on(t.barbershopId, t.startDate),
    bsUserCreatedIdx: index("weekly_cycles_bs_user_created_idx").on(t.barbershopId, t.userId, t.createdAt),
  }),
);

export type WeeklyCycle = typeof weeklyCyclesTable.$inferSelect;
