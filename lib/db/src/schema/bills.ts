import { pgTable, serial, text, integer, numeric, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

export const billsTable = pgTable(
  "bills",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    dueDay: integer("due_day").notNull(),
    category: text("category").default("Fixa"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bsIdx: index("bills_bs_idx").on(t.barbershopId),
  }),
);

export type Bill = typeof billsTable.$inferSelect;
