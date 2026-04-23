import { pgTable, serial, text, numeric, integer, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

/**
 * Contas pessoais fixas (semáforo no Dashboard).
 * `diaVencimento` é o dia do mês (1..31). `ativa=false` desativa sem apagar.
 */
export const personalBillsTable = pgTable(
  "personal_bills",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    diaVencimento: integer("dia_vencimento").notNull(),
    categoria: text("categoria").notNull().default("conta_fixa"),
    ativa: boolean("ativa").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsUserIdx: index("personal_bills_bs_user_idx").on(t.barbershopId, t.userId),
  }),
);

export type PersonalBill = typeof personalBillsTable.$inferSelect;
