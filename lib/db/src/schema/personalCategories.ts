import { pgTable, serial, text, boolean, timestamp, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { barbershopsTable } from "./barbershops";

/**
 * Cards do extrato pessoal. Cada usuário começa com cards fixos seedados:
 *  - banco (No Banco)
 *  - reserva (Reserva)
 *  - lazer / comida / outros (limites)
 *  - contas (pseudo-card, saldo derivado das contas a pagar)
 * `system=true` impede exclusão. `removable=false` impede edição do slug.
 */
export const personalCategoriesTable = pgTable(
  "personal_categories",
  {
    id: serial("id").primaryKey(),
    barbershopId: uuid("barbershop_id").notNull().references(() => barbershopsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    nome: text("nome").notNull(),
    icon: text("icon").notNull().default("Wallet"),
    color: text("color").notNull().default("primary"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex("personal_categories_slug_unique").on(t.barbershopId, t.userId, t.slug),
    bsUserIdx: index("personal_categories_bs_user_idx").on(t.barbershopId, t.userId),
  }),
);

export type PersonalCategory = typeof personalCategoriesTable.$inferSelect;
