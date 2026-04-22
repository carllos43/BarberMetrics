import { pgTable, serial, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

export const settingsTable = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    bsUserKeyUniq: uniqueIndex("settings_bs_user_key_uniq").on(t.barbershopId, t.userId, t.key),
  }),
);

export type Setting = typeof settingsTable.$inferSelect;
