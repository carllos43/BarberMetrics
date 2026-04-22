import { pgTable, serial, boolean, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

export const timerSessionsTable = pgTable(
  "timer_sessions",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => ({
    bsUserActiveIdx: index("timer_bs_user_active_idx").on(t.barbershopId, t.userId, t.isActive),
  }),
);

export type TimerSession = typeof timerSessionsTable.$inferSelect;
