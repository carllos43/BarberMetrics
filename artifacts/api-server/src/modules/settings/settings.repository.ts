import { and, eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

export interface SettingsRepo {
  get(bsId: string, userId: string, key: string): Promise<string | null>;
  upsert(bsId: string, userId: string, key: string, value: string): Promise<void>;
}

export class DrizzleSettingsRepo implements SettingsRepo {
  async get(bsId: string, userId: string, key: string) {
    const [r] = await db.select().from(settingsTable).where(and(
      eq(settingsTable.barbershopId, bsId),
      eq(settingsTable.userId, userId),
      eq(settingsTable.key, key),
    )).limit(1);
    return r?.value ?? null;
  }
  async upsert(bsId: string, userId: string, key: string, value: string) {
    const existing = await this.get(bsId, userId, key);
    if (existing !== null) {
      await db.update(settingsTable).set({ value })
        .where(and(
          eq(settingsTable.barbershopId, bsId),
          eq(settingsTable.userId, userId),
          eq(settingsTable.key, key),
        ));
    } else {
      await db.insert(settingsTable).values({
        barbershopId: bsId, userId, key, value,
      });
    }
  }
}
