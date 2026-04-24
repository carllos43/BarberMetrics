import { pgTable, serial, text, numeric, integer, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";
import { personalCategoriesTable } from "./personalCategories";
import { personalBillsTable } from "./personalBills";

/**
 * Extrato unificado do módulo financeiro pessoal.
 * `type`:
 *  - 'entrada'   → crédito no card (ex: fechamento de semana → Banco)
 *  - 'gasto'     → débito (vale registrado em uma categoria)
 *  - 'pagamento' → débito no Banco vinculado a uma conta paga (billId)
 * Saldo do card = SUM(entrada) - SUM(gasto + pagamento) WHERE deleted=false.
 * Soft-delete via `deleted=true` pra preservar histórico.
 */
export const transactionsTable = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    categoryId: integer("category_id").references(() => personalCategoriesTable.id, { onDelete: "set null" }),
    billId: integer("bill_id").references(() => personalBillsTable.id, { onDelete: "set null" }),
    description: text("description"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsUserIdx: index("transactions_bs_user_idx").on(t.barbershopId, t.userId),
    categoryIdx: index("transactions_category_idx").on(t.categoryId),
    occurredIdx: index("transactions_occurred_idx").on(t.barbershopId, t.userId, t.occurredAt),
    billIdx: index("transactions_bill_idx").on(t.billId),
  }),
);

export type TransactionRow = typeof transactionsTable.$inferSelect;
