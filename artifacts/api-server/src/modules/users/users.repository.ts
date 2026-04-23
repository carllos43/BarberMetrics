import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  commissionPercent: number;
}

export interface UsersRepo {
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  upsert(input: { id: string; email: string; fullName: string }): Promise<UserRow>;
  getCommissionPercent(userId: string): Promise<number>;
  updateCommissionPercent(userId: string, percent: number): Promise<void>;
}

export class DrizzleUsersRepo implements UsersRepo {
  async findByEmail(email: string) {
    const [r] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return r ?? null;
  }
  async findById(id: string) {
    const [r] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return r ?? null;
  }
  /**
   * Inserts (or returns the existing) profile row matching a Supabase auth user.
   * The `id` MUST equal `auth.users.id`.
   */
  async upsert(input: { id: string; email: string; fullName: string }) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, input.id)).limit(1);
    if (existing) return existing;
    const [r] = await db.insert(usersTable).values({
      id: input.id, email: input.email, fullName: input.fullName,
    }).returning();
    return r;
  }
  async getCommissionPercent(userId: string) {
    const [r] = await db.select({ pct: usersTable.commissionPercent })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return r?.pct ?? 60;
  }
  async updateCommissionPercent(userId: string, percent: number) {
    await db.update(usersTable)
      .set({ commissionPercent: Math.round(percent) })
      .where(eq(usersTable.id, userId));
  }
}
