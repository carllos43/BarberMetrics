import { and, eq } from "drizzle-orm";
import { db, membershipsTable, barbershopsTable } from "@workspace/db";

export interface MembershipRow {
  userId: string;
  barbershopId: string;
  role: string;
  status: string;
}

export interface BarbershopRow {
  id: string;
  name: string;
  slug: string;
}

export interface MembershipsRepo {
  findActiveForUser(userId: string): Promise<MembershipRow | null>;
  createBarbershopForOwner(input: { ownerUserId: string; name: string; slug: string }): Promise<BarbershopRow>;
  getBarbershop(id: string): Promise<BarbershopRow | null>;
}

export class DrizzleMembershipsRepo implements MembershipsRepo {
  async findActiveForUser(userId: string) {
    const [r] = await db.select({
      userId: membershipsTable.userId,
      barbershopId: membershipsTable.barbershopId,
      role: membershipsTable.role,
      status: membershipsTable.status,
    }).from(membershipsTable)
      .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.status, "active")))
      .limit(1);
    return r ?? null;
  }

  async createBarbershopForOwner(input: { ownerUserId: string; name: string; slug: string }) {
    return db.transaction(async (tx) => {
      const [bs] = await tx.insert(barbershopsTable).values({ name: input.name, slug: input.slug }).returning();
      await tx.insert(membershipsTable).values({
        userId: input.ownerUserId,
        barbershopId: bs.id,
        role: "owner",
        status: "active",
      });
      return bs;
    });
  }

  async getBarbershop(id: string) {
    const [r] = await db.select().from(barbershopsTable).where(eq(barbershopsTable.id, id)).limit(1);
    return r ?? null;
  }
}
