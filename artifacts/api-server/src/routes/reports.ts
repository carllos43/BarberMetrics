import { Router, type IRouter } from "express";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";
import { GetStatementQueryParams, GetStatementResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/statement", async (req, res): Promise<void> => {
  const parsed = GetStatementQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { start, end } = parsed.data;
  const userId = req.userId!;

  const rows = await db
    .select()
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.userId, userId),
        gte(appointmentsTable.date, start),
        lte(appointmentsTable.date, end),
      ),
    )
    .orderBy(appointmentsTable.date, appointmentsTable.startTime);

  const mapped = rows.map((a) => ({
    id: a.id,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    durationMinutes: a.durationMinutes,
    service: a.service,
    value: parseFloat(a.value),
    barberEarnings: parseFloat(a.barberEarnings),
    createdAt: a.createdAt,
  }));

  res.json(GetStatementResponse.parse(mapped));
});

export default router;
