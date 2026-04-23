import { pgTable, serial, numeric, integer, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

/**
 * Aba "Financeiro Pessoal" do barbeiro: saldos e limites por categoria.
 * Linha única por (barbershopId, userId).
 */
export const personalFinancesTable = pgTable(
  "personal_finances",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    saldoBanco: numeric("saldo_banco", { precision: 12, scale: 2 }).notNull().default("0"),
    saldoGuardado: numeric("saldo_guardado", { precision: 12, scale: 2 }).notNull().default("0"),
    /** % do saldo semanal que vai pra "caixinha" (reserva) no fechamento. */
    percentualCaixinha: integer("percentual_caixinha").notNull().default(10),
    limiteLazer: numeric("limite_lazer", { precision: 12, scale: 2 }).notNull().default("0"),
    limiteComida: numeric("limite_comida", { precision: 12, scale: 2 }).notNull().default("0"),
    limiteOutros: numeric("limite_outros", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsUserUnique: uniqueIndex("personal_finances_bs_user_unique").on(t.barbershopId, t.userId),
  }),
);

export type PersonalFinances = typeof personalFinancesTable.$inferSelect;
