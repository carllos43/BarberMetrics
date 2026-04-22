import { pgTable, serial, boolean, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const timerSessionsTable = pgTable(
  "timer_sessions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => ({
    userActiveIdx: index("timer_user_active_idx").on(t.userId, t.isActive),
  }),
);

export const insertTimerSessionSchema = createInsertSchema(timerSessionsTable).omit({ id: true });
export type InsertTimerSession = z.infer<typeof insertTimerSessionSchema>;
export type TimerSession = typeof timerSessionsTable.$inferSelect;
