import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, billsTable } from "@workspace/db";
import {
  CreateBillBody,
  ListBillsResponse,
  DeleteBillParams,
  UpdateBillParams,
  UpdateBillBody,
  UpdateBillResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bills", async (req, res): Promise<void> => {
  const bills = await db.select().from(billsTable).orderBy(billsTable.dueDay);
  const mapped = bills.map((b) => ({
    ...b,
    value: parseFloat(b.value),
  }));
  res.json(ListBillsResponse.parse(mapped));
});

router.post("/bills", async (req, res): Promise<void> => {
  const parsed = CreateBillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bill] = await db
    .insert(billsTable)
    .values({
      name: parsed.data.name,
      value: parsed.data.value.toString(),
      dueDay: parsed.data.dueDay,
      category: parsed.data.category,
    })
    .returning();

  res.status(201).json({
    ...bill,
    value: parseFloat(bill.value),
  });
});

router.patch("/bills/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateBillParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [bill] = await db
    .update(billsTable)
    .set({
      name: parsed.data.name,
      value: parsed.data.value.toString(),
      dueDay: parsed.data.dueDay,
      category: parsed.data.category,
    })
    .where(eq(billsTable.id, params.data.id))
    .returning();

  if (!bill) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  res.json(UpdateBillResponse.parse({
    ...bill,
    value: parseFloat(bill.value),
  }));
});

router.delete("/bills/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteBillParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(billsTable).where(eq(billsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
