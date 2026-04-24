import { and, eq, asc } from "drizzle-orm";
import { db, personalCategoriesTable } from "@workspace/db";

export interface PersonalCategoryDTO {
  id: number;
  slug: string;
  nome: string;
  icon: string;
  color: string;
  isSystem: boolean;
}

const fromRow = (r: typeof personalCategoriesTable.$inferSelect): PersonalCategoryDTO => ({
  id: r.id,
  slug: r.slug,
  nome: r.nome,
  icon: r.icon,
  color: r.color,
  isSystem: r.isSystem,
});

export const SYSTEM_CATEGORIES: ReadonlyArray<{ slug: string; nome: string; icon: string; color: string }> = [
  { slug: "banco", nome: "No Banco", icon: "Banknote", color: "emerald" },
  { slug: "contas", nome: "Contas", icon: "Receipt", color: "rose" },
  { slug: "reserva", nome: "Reserva", icon: "PiggyBank", color: "violet" },
  { slug: "lazer", nome: "Lazer", icon: "Coffee", color: "amber" },
  { slug: "comida", nome: "Comida", icon: "ShoppingBag", color: "pink" },
  { slug: "outros", nome: "Outros", icon: "Wallet", color: "slate" },
];

export interface PersonalCategoriesRepo {
  list(bsId: string, userId: string): Promise<PersonalCategoryDTO[]>;
  findById(bsId: string, id: number): Promise<PersonalCategoryDTO | null>;
  findBySlug(bsId: string, userId: string, slug: string): Promise<PersonalCategoryDTO | null>;
  create(bsId: string, userId: string, v: { slug: string; nome: string; icon?: string; color?: string; isSystem?: boolean }): Promise<PersonalCategoryDTO>;
  update(bsId: string, id: number, patch: Partial<{ nome: string; icon: string; color: string }>): Promise<PersonalCategoryDTO | null>;
  delete(bsId: string, id: number): Promise<void>;
  ensureSystemCategories(bsId: string, userId: string): Promise<PersonalCategoryDTO[]>;
}

export class DrizzlePersonalCategoriesRepo implements PersonalCategoriesRepo {
  async list(bsId: string, userId: string) {
    const rows = await db.select().from(personalCategoriesTable)
      .where(and(eq(personalCategoriesTable.barbershopId, bsId), eq(personalCategoriesTable.userId, userId)))
      .orderBy(asc(personalCategoriesTable.id));
    return rows.map(fromRow);
  }
  async findById(bsId: string, id: number) {
    const [r] = await db.select().from(personalCategoriesTable)
      .where(and(eq(personalCategoriesTable.barbershopId, bsId), eq(personalCategoriesTable.id, id))).limit(1);
    return r ? fromRow(r) : null;
  }
  async findBySlug(bsId: string, userId: string, slug: string) {
    const [r] = await db.select().from(personalCategoriesTable)
      .where(and(
        eq(personalCategoriesTable.barbershopId, bsId),
        eq(personalCategoriesTable.userId, userId),
        eq(personalCategoriesTable.slug, slug),
      )).limit(1);
    return r ? fromRow(r) : null;
  }
  async create(bsId: string, userId: string, v: { slug: string; nome: string; icon?: string; color?: string; isSystem?: boolean }) {
    const [r] = await db.insert(personalCategoriesTable).values({
      barbershopId: bsId,
      userId,
      slug: v.slug,
      nome: v.nome,
      icon: v.icon ?? "Wallet",
      color: v.color ?? "primary",
      isSystem: v.isSystem ?? false,
    }).returning();
    return fromRow(r);
  }
  async update(bsId: string, id: number, patch: Partial<{ nome: string; icon: string; color: string }>) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.nome !== undefined) set.nome = patch.nome;
    if (patch.icon !== undefined) set.icon = patch.icon;
    if (patch.color !== undefined) set.color = patch.color;
    const [r] = await db.update(personalCategoriesTable).set(set)
      .where(and(eq(personalCategoriesTable.barbershopId, bsId), eq(personalCategoriesTable.id, id)))
      .returning();
    return r ? fromRow(r) : null;
  }
  async delete(bsId: string, id: number) {
    await db.delete(personalCategoriesTable)
      .where(and(eq(personalCategoriesTable.barbershopId, bsId), eq(personalCategoriesTable.id, id)));
  }
  async ensureSystemCategories(bsId: string, userId: string) {
    const existing = await this.list(bsId, userId);
    const haveSlugs = new Set(existing.map((c) => c.slug));
    for (const sys of SYSTEM_CATEGORIES) {
      if (!haveSlugs.has(sys.slug)) {
        await this.create(bsId, userId, { ...sys, isSystem: true });
      }
    }
    return this.list(bsId, userId);
  }
}
