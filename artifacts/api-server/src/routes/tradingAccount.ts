import { Router, type IRouter } from "express";
import { db, tradingAccountTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /trading-account — get current user's account
router.get("/trading-account", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }
  const [account] = await db
    .select()
    .from(tradingAccountTable)
    .where(eq(tradingAccountTable.userId, req.session.userId))
    .limit(1);

  if (!account) {
    res.status(404).json({ error: "Aucun compte de trading configuré." });
    return;
  }

  res.json({
    id: account.id,
    platformName: account.platformName,
    accountId: account.accountId,
    capital: parseFloat(account.capital),
    profitTarget: parseFloat(account.profitTarget),
    riskLevel: account.riskLevel,
    timeframe: account.timeframe,
  });
});

// POST /trading-account — create or update
router.post("/trading-account", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const { platformName, accountId, accountPassword, capital, profitTarget, riskLevel, timeframe } = req.body as {
    platformName?: string;
    accountId?: string;
    accountPassword?: string;
    capital?: number;
    profitTarget?: number;
    riskLevel?: string;
    timeframe?: string;
  };

  if (!platformName || !accountId || !capital || !profitTarget) {
    res.status(400).json({ error: "Plateforme, identifiant de compte, capital et objectif requis." });
    return;
  }

  // Upsert: delete existing + insert
  await db.delete(tradingAccountTable).where(eq(tradingAccountTable.userId, req.session.userId));

  const [account] = await db.insert(tradingAccountTable).values({
    userId: req.session.userId,
    platformName,
    accountId,
    accountPassword: accountPassword ?? null,
    capital: capital.toString(),
    profitTarget: profitTarget.toString(),
    riskLevel: riskLevel ?? "MEDIUM",
    timeframe: timeframe ?? "H1",
  }).returning();

  res.json({
    id: account!.id,
    platformName: account!.platformName,
    accountId: account!.accountId,
    capital: parseFloat(account!.capital),
    profitTarget: parseFloat(account!.profitTarget),
    riskLevel: account!.riskLevel,
    timeframe: account!.timeframe,
  });
});

export { router as tradingAccountRouter };
