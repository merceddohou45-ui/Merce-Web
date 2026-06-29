import { Router, type IRouter } from "express";
import { db, brokerSessionTable, signalHistoryTable, tradingAccountTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetAssetsResponse,
  ScanMarketsResponse,
} from "@workspace/api-zod";
import { getBrokerAssets, generateSignals } from "../lib/marketEngine";
import { fetchBatchPrices } from "../lib/twelveData";

const router: IRouter = Router();

router.get("/assets", async (req, res): Promise<void> => {
  const [session] = await db
    .select()
    .from(brokerSessionTable)
    .where(eq(brokerSessionTable.connected, true))
    .orderBy(desc(brokerSessionTable.connectedAt))
    .limit(1);

  const broker = session?.broker ?? "default";
  const assets = getBrokerAssets(broker);

  // Validate base assets structure
  const validated = GetAssetsResponse.parse(assets);

  // Enrich with live prices (outside Zod schema, for display only)
  const symbols = validated.map((a) => a.symbol);
  const prices = await fetchBatchPrices(symbols);

  const enriched = validated.map((a) => ({
    ...a,
    livePrice: prices[a.symbol] ?? null,
  }));

  res.json(enriched);
});

router.get("/scan", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const [account] = await db
    .select()
    .from(tradingAccountTable)
    .where(eq(tradingAccountTable.userId, req.session.userId))
    .limit(1);

  const [session] = await db
    .select()
    .from(brokerSessionTable)
    .where(eq(brokerSessionTable.connected, true))
    .orderBy(desc(brokerSessionTable.connectedAt))
    .limit(1);

  const broker = session?.broker ?? account?.platformName ?? "default";
  const riskLevel = (account?.riskLevel ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";
  const timeframe = account?.timeframe ?? "H1";
  const capital = account ? parseFloat(account.capital) : 1000;

  const signals = await generateSignals(broker, riskLevel, timeframe, capital);

  if (signals.length > 0) {
    await db.insert(signalHistoryTable).values(
      signals.map((s) => ({
        symbol: s.symbol,
        direction: s.direction,
        entry: s.entry.toString(),
        stopLoss: s.stopLoss.toString(),
        takeProfit1: s.takeProfit1.toString(),
        takeProfit2: s.takeProfit2.toString(),
        takeProfit3: s.takeProfit3.toString(),
        timeframe: s.timeframe,
        confidence: s.confidence,
        riskPercent: s.riskPercent.toString(),
        reason: s.reason,
        status: "active",
      }))
    );
  }

  req.log.info({ broker, count: signals.length }, "Scan marché terminé");
  res.json(ScanMarketsResponse.parse(signals));
});

export default router;
