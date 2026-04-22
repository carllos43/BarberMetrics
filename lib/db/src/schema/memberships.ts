import { pgTable, serial, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

export const membershipsTable = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("barber"), // owner | manager | barber
    status: text("status").notNull().default("active"), // active | revoked
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("memberships_user_bs_uniq").on(t.userId, t.barbershopId),
  }),
);

export type Membership = typeof membershipsTable.$inferSelect;
