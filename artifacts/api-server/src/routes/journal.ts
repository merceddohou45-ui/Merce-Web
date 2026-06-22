import { Router, type IRouter } from "express";
import { db, journalEntryTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/journal/:positionId", async (req, res) => {
  const positionId = parseInt(req.params.positionId, 10);
  if (isNaN(positionId)) {
    res.status(400).json({ error: "Invalid positionId" });
    return;
  }
  const entries = await db
    .select()
    .from(journalEntryTable)
    .where(eq(journalEntryTable.positionId, positionId))
    .orderBy(desc(journalEntryTable.createdAt));
  res.json(
    entries.map((e) => ({
      id: e.id,
      positionId: e.positionId,
      entryType: e.entryType,
      emotion: e.emotion,
      reasoning: e.reasoning,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt?.toISOString() ?? null,
    }))
  );
});

router.post("/journal", async (req, res) => {
  const { positionId, entryType, emotion, reasoning, notes } = req.body as {
    positionId: number;
    entryType: string;
    emotion?: string | null;
    reasoning?: string | null;
    notes?: string | null;
  };
  if (!positionId || !entryType) {
    res.status(400).json({ error: "positionId and entryType are required" });
    return;
  }
  const [created] = await db
    .insert(journalEntryTable)
    .values({ positionId, entryType, emotion, reasoning, notes })
    .returning();
  res.json({
    id: created!.id,
    positionId: created!.positionId,
    entryType: created!.entryType,
    emotion: created!.emotion,
    reasoning: created!.reasoning,
    notes: created!.notes,
    createdAt: created!.createdAt.toISOString(),
    updatedAt: created!.updatedAt?.toISOString() ?? null,
  });
});

router.patch("/journal/:positionId/entry/:id", async (req, res) => {
  const positionId = parseInt(req.params.positionId, 10);
  const id = parseInt(req.params.id, 10);
  if (isNaN(positionId) || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { entryType, emotion, reasoning, notes } = req.body as {
    entryType?: string;
    emotion?: string | null;
    reasoning?: string | null;
    notes?: string | null;
  };
  const [updated] = await db
    .update(journalEntryTable)
    .set({
      ...(entryType !== undefined && { entryType }),
      ...(emotion !== undefined && { emotion }),
      ...(reasoning !== undefined && { reasoning }),
      ...(notes !== undefined && { notes }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(journalEntryTable.id, id),
        eq(journalEntryTable.positionId, positionId)
      )
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.json({
    id: updated.id,
    positionId: updated.positionId,
    entryType: updated.entryType,
    emotion: updated.emotion,
    reasoning: updated.reasoning,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt?.toISOString() ?? null,
  });
});

router.delete("/journal/:positionId/entry/:id", async (req, res) => {
  const positionId = parseInt(req.params.positionId, 10);
  const id = parseInt(req.params.id, 10);
  if (isNaN(positionId) || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(journalEntryTable)
    .where(
      and(
        eq(journalEntryTable.id, id),
        eq(journalEntryTable.positionId, positionId)
      )
    );
  res.json({ status: "ok" });
});

export { router as journalRouter };
