import { Router, type IRouter } from "express";
import { db, signalHistoryTable, tradingProfileTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  GetSignalHistoryResponse,
  GetSignalStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/signals/history", async (req, res): Promise<void> => {
  const records = await db
    .select()
    .from(signalHistoryTable)
    .orderBy(desc(signalHistoryTable.generatedAt))
    .limit(100);

  res.json(GetSignalHistoryResponse.parse(
    records.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      direction: r.direction,
      entry: parseFloat(r.entry),
      stopLoss: parseFloat(r.stopLoss),
      takeProfit1: parseFloat(r.takeProfit1),
      takeProfit2: parseFloat(r.takeProfit2),
      takeProfit3: parseFloat(r.takeProfit3),
      timeframe: r.timeframe,
      confidence: r.confidence,
      status: r.status,
      riskPercent: parseFloat(r.riskPercent),
      profitLoss: r.profitLoss ? parseFloat(r.profitLoss) : null,
      generatedAt: r.generatedAt.toISOString(),
    }))
  ));
});

router.get("/signals/stats", async (req, res): Promise<void> => {
  const records = await db.select().from(signalHistoryTable);
  const profile = await db
    .select()
    .from(tradingProfileTable)
    .orderBy(desc(tradingProfileTable.createdAt))
    .limit(1);

  const total = records.length;
  const active = records.filter((r) => r.status === "active").length;
  const won = records.filter((r) => r.status === "won").length;
  const lost = records.filter((r) => r.status === "lost").length;
  const winRate = total > 0 ? parseFloat(((won / Math.max(won + lost, 1)) * 100).toFixed(1)) : 0;
  const avgConfidence = total > 0
    ? parseFloat((records.reduce((sum, r) => sum + r.confidence, 0) / total).toFixed(1))
    : 0;

  const capital = profile[0] ? parseFloat(profile[0].capital) : 1000;
  const estimatedProfit = records.reduce((sum, r) => {
    if (r.status === "won") return sum + capital * parseFloat(r.riskPercent) * 0.015;
    if (r.status === "lost") return sum - capital * parseFloat(r.riskPercent) * 0.01;
    return sum;
  }, 0);

  res.json(GetSignalStatsResponse.parse({
    totalSignals: total,
    activeSignals: active,
    winRate,
    avgConfidence,
    estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
    totalWon: won,
    totalLost: lost,
  }));
});

export default router;
