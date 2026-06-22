import { Router, type IRouter } from "express";
import { db, brokerSessionTable, signalHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetAssetsResponse,
  ScanMarketsResponse,
} from "@workspace/api-zod";
import { getBrokerAssets, generateSignals } from "../lib/marketEngine";

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

  res.json(GetAssetsResponse.parse(assets));
});

router.get("/scan", async (req, res): Promise<void> => {
  const [session] = await db
    .select()
    .from(brokerSessionTable)
    .where(eq(brokerSessionTable.connected, true))
    .orderBy(desc(brokerSessionTable.connectedAt))
    .limit(1);

  const broker = session?.broker ?? "default";

  // Get user's risk/timeframe from the most recent profile
  const { tradingProfileTable } = await import("@workspace/db");
  const [profile] = await db
    .select()
    .from(tradingProfileTable)
    .orderBy(desc(tradingProfileTable.createdAt))
    .limit(1);

  const riskLevel = (profile?.riskLevel ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";
  const timeframe = profile?.timeframe ?? "M5";

  const signals = generateSignals(broker, riskLevel, timeframe);

  // Save signals to history
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

  req.log.info({ broker, count: signals.length }, "Market scan complete");

  res.json(ScanMarketsResponse.parse(signals));
});

export default router;
