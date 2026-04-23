import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Mirror table of Supabase `auth.users`. The `id` here MUST equal
 * `auth.users.id` for the user. Auth (email + password) lives in Supabase;
 * this table only stores app-level profile data + tenant linkage helpers.
 */
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("barber"),
  commissionPercent: integer("commission_percent").notNull().default(60),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
