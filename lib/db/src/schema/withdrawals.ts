import { pgTable, serial, text, numeric, boolean, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";
import { weeklyCyclesTable } from "./weeklyCycles";

/**
 * Vales / retiradas (Mobills). Sempre vinculados a um ciclo semanal.
 * `categoriaDestino` ∈ { 'gasto_livre', 'conta_fixa', 'reserva' }.
 * `isExcedente=true` quando o vale excedeu o saldo disponível.
 */
export const withdrawalsTable = pgTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    weeklyCycleId: integer("weekly_cycle_id").references(() => weeklyCyclesTable.id, { onDelete: "set null" }),
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    categoriaDestino: text("categoria_destino").notNull().default("gasto_livre"),
    descricao: text("descricao"),
    isExcedente: boolean("is_excedente").notNull().default(false),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsUserIdx: index("withdrawals_bs_user_idx").on(t.barbershopId, t.userId),
    cycleIdx: index("withdrawals_cycle_idx").on(t.weeklyCycleId),
    bsUserCreatedIdx: index("withdrawals_bs_user_created_idx").on(t.barbershopId, t.userId, t.createdAt),
  }),
);

export type Withdrawal = typeof withdrawalsTable.$inferSelect;
