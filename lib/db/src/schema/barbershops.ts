import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const barbershopsTable = pgTable("barbershops", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Barbershop = typeof barbershopsTable.$inferSelect;
