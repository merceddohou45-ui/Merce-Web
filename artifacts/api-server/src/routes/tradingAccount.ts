import { Router, type IRouter } from "express";
import { db, tradingAccountTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /trading-account — get current user's account
router.get("/trading-account", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié. Veuillez vous reconnecter." });
    return;
  }
  try {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur base de données.";
    req.log?.error({ err }, "Erreur GET trading-account");
    res.status(500).json({ error: `Impossible de récupérer le compte: ${message}` });
  }
});

// POST /trading-account — create or update
router.post("/trading-account", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié. Veuillez vous reconnecter." });
    return;
  }

  const {
    platformName,
    accountId,
    accountPassword,
    capital,
    profitTarget,
    riskLevel,
    timeframe,
  } = req.body as {
    platformName?: string;
    accountId?: string;
    accountPassword?: string | null;
    capital?: number;
    profitTarget?: number;
    riskLevel?: string;
    timeframe?: string;
  };

  // Granular validation — return the specific field that is missing
  if (!platformName?.trim()) {
    res.status(400).json({ error: "La plateforme de trading est requise." });
    return;
  }
  if (!accountId?.trim()) {
    res.status(400).json({ error: "L'identifiant du compte est requis." });
    return;
  }
  if (!capital || isNaN(Number(capital)) || Number(capital) < 1) {
    res.status(400).json({ error: "Le capital doit être un nombre positif (minimum 1 USD)." });
    return;
  }
  if (!profitTarget || isNaN(Number(profitTarget)) || Number(profitTarget) < 1) {
    res.status(400).json({ error: "L'objectif de profit doit être un nombre positif (minimum 1 USD)." });
    return;
  }

  const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
  const safeRiskLevel = validRiskLevels.includes(riskLevel ?? "") ? riskLevel! : "MEDIUM";

  const validTimeframes = ["M1", "M5", "M15", "H1", "H4", "D1"];
  const safeTimeframe = validTimeframes.includes(timeframe ?? "") ? timeframe! : "H1";

  try {
    // Upsert: delete existing + insert fresh
    await db.delete(tradingAccountTable).where(eq(tradingAccountTable.userId, req.session.userId));

    const [account] = await db
      .insert(tradingAccountTable)
      .values({
        userId: req.session.userId,
        platformName: platformName.trim(),
        accountId: accountId.trim(),
        accountPassword: accountPassword?.trim() || null,
        capital: Number(capital).toFixed(2),
        profitTarget: Number(profitTarget).toFixed(2),
        riskLevel: safeRiskLevel,
        timeframe: safeTimeframe,
      })
      .returning();

    if (!account) {
      res.status(500).json({ error: "Erreur lors de la création du compte. Veuillez réessayer." });
      return;
    }

    req.log?.info({ userId: req.session.userId, platform: account.platformName }, "Compte trading configuré");

    res.json({
      id: account.id,
      platformName: account.platformName,
      accountId: account.accountId,
      capital: parseFloat(account.capital),
      profitTarget: parseFloat(account.profitTarget),
      riskLevel: account.riskLevel,
      timeframe: account.timeframe,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    req.log?.error({ err, userId: req.session.userId }, "Erreur POST trading-account");
    res.status(500).json({ error: `Impossible d'enregistrer le compte: ${message}` });
  }
});

export { router as tradingAccountRouter };
