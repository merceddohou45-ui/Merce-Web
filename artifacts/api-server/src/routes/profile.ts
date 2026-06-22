import { Router, type IRouter } from "express";
import { db, tradingProfileTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  SaveProfileBody,
  GetProfileResponse,
  SaveProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(tradingProfileTable)
    .orderBy(desc(tradingProfileTable.createdAt))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "No profile found" });
    return;
  }

  res.json(GetProfileResponse.parse({
    id: profile.id,
    capital: parseFloat(profile.capital),
    profitTarget: parseFloat(profile.profitTarget),
    profitTargetPercent: profile.profitTargetPercent ? parseFloat(profile.profitTargetPercent) : null,
    riskLevel: profile.riskLevel,
    timeframe: profile.timeframe,
    broker: profile.broker,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt?.toISOString() ?? null,
  }));
});

router.post("/profile", async (req, res): Promise<void> => {
  const parsed = SaveProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { capital, profitTarget, profitTargetPercent, riskLevel, timeframe } = parsed.data;

  const [profile] = await db
    .insert(tradingProfileTable)
    .values({
      capital: capital.toString(),
      profitTarget: profitTarget.toString(),
      profitTargetPercent: profitTargetPercent != null ? profitTargetPercent.toString() : null,
      riskLevel,
      timeframe,
    })
    .returning();

  req.log.info({ profileId: profile.id }, "Trading profile saved");

  res.json(SaveProfileResponse.parse({
    id: profile.id,
    capital: parseFloat(profile.capital),
    profitTarget: parseFloat(profile.profitTarget),
    profitTargetPercent: profile.profitTargetPercent ? parseFloat(profile.profitTargetPercent) : null,
    riskLevel: profile.riskLevel,
    timeframe: profile.timeframe,
    broker: profile.broker,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt?.toISOString() ?? null,
  }));
});

export default router;
