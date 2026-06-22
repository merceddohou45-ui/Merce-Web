import { Router, type IRouter } from "express";
import { db, journalEntryTable, portfolioPositionTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";

const router: IRouter = Router();

const EMOTIONS = [
  "CONFIDENT",
  "DISCIPLINED",
  "PATIENT",
  "NEUTRAL",
  "NERVOUS",
  "FOMO",
  "GREEDY",
  "FEARFUL",
] as const;

router.get("/analytics/psychology", async (req, res) => {
  // Fetch all journal entries that have an emotion tag
  const entries = await db
    .select({
      id: journalEntryTable.id,
      positionId: journalEntryTable.positionId,
      emotion: journalEntryTable.emotion,
      entryType: journalEntryTable.entryType,
      createdAt: journalEntryTable.createdAt,
    })
    .from(journalEntryTable)
    .where(isNotNull(journalEntryTable.emotion));

  // Fetch all closed positions (they have a definitive outcome)
  const closedPositions = await db
    .select({
      id: portfolioPositionTable.id,
      status: portfolioPositionTable.status,
      realizedPnl: portfolioPositionTable.realizedPnl,
      closeReason: portfolioPositionTable.closeReason,
    })
    .from(portfolioPositionTable)
    .where(isNotNull(portfolioPositionTable.closedAt));

  const positionOutcomes = new Map<
    number,
    { pnl: number; isWin: boolean; isLoss: boolean }
  >();

  for (const pos of closedPositions) {
    const pnl = pos.realizedPnl ? parseFloat(pos.realizedPnl) : 0;
    const isWin = pnl > 0;
    const isLoss = pnl < 0;
    positionOutcomes.set(pos.id, { pnl, isWin, isLoss });
  }

  // Aggregate per emotion
  const emotionMap = new Map<
    string,
    {
      emotion: string;
      totalEntries: number;
      linkedPositionIds: Set<number>;
      winCount: number;
      lossCount: number;
      totalPnl: number;
    }
  >();

  for (const emotion of EMOTIONS) {
    emotionMap.set(emotion, {
      emotion,
      totalEntries: 0,
      linkedPositionIds: new Set(),
      winCount: 0,
      lossCount: 0,
      totalPnl: 0,
    });
  }

  for (const entry of entries) {
    const em = entry.emotion?.toUpperCase();
    if (!em || !emotionMap.has(em)) continue;
    const stat = emotionMap.get(em)!;
    stat.totalEntries++;
    stat.linkedPositionIds.add(entry.positionId);

    const outcome = positionOutcomes.get(entry.positionId);
    if (outcome) {
      if (outcome.isWin) stat.winCount++;
      if (outcome.isLoss) stat.lossCount++;
      stat.totalPnl += outcome.pnl;
    }
  }

  const emotionStats = Array.from(emotionMap.values()).map((stat) => {
    const totalOutcomes = stat.winCount + stat.lossCount;
    const winRate = totalOutcomes > 0 ? (stat.winCount / totalOutcomes) * 100 : null;
    const avgPnl = totalOutcomes > 0 ? stat.totalPnl / totalOutcomes : null;
    return {
      emotion: stat.emotion,
      totalEntries: stat.totalEntries,
      linkedPositions: stat.linkedPositionIds.size,
      winCount: stat.winCount,
      lossCount: stat.lossCount,
      winRate: winRate !== null ? parseFloat(winRate.toFixed(1)) : null,
      avgPnl: avgPnl !== null ? parseFloat(avgPnl.toFixed(2)) : null,
    };
  });

  // Entry type breakdown
  const allEntries = await db.select({ entryType: journalEntryTable.entryType }).from(journalEntryTable);
  const entryTypeBreakdown: Record<string, number> = { note: 0, open: 0, close: 0 };
  for (const e of allEntries) {
    const t = e.entryType ?? "note";
    entryTypeBreakdown[t] = (entryTypeBreakdown[t] ?? 0) + 1;
  }

  // Find top emotions by win rate (min 1 outcome) and by loss rate
  const withOutcomes = emotionStats.filter((e) => e.winCount + e.lossCount >= 1 && e.winRate !== null);
  const topWinEmotion = withOutcomes.sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0]?.emotion ?? null;
  const topLossEmotion = [...withOutcomes].sort((a, b) => (a.winRate ?? 0) - (b.winRate ?? 0))[0]?.emotion ?? null;

  // Unique positions that have at least one journal entry
  const uniqueJournaledPositions = new Set(entries.map((e) => e.positionId)).size;

  // Rule-based insights
  const insights: string[] = [];

  for (const stat of emotionStats) {
    const total = stat.winCount + stat.lossCount;
    if (total < 1) continue;
    const wr = stat.winRate!;
    if (wr >= 75) {
      insights.push(
        `When you feel ${stat.emotion}, you win ${wr}% of the time — this is your strongest emotional state.`
      );
    } else if (wr <= 30) {
      insights.push(
        `${stat.emotion} trades result in only a ${wr}% win rate — consider pausing when you feel this way.`
      );
    }
    if (stat.avgPnl !== null && stat.avgPnl > 0 && wr >= 60) {
      insights.push(
        `${stat.emotion} trades average +$${stat.avgPnl} P&L — keep logging this emotion.`
      );
    }
    if (stat.avgPnl !== null && stat.avgPnl < 0) {
      insights.push(
        `${stat.emotion} trades average -$${Math.abs(stat.avgPnl)} P&L — this emotion is costing you money.`
      );
    }
  }

  const totalJournalEntries = await db
    .select({ id: journalEntryTable.id })
    .from(journalEntryTable);

  if (insights.length === 0 && totalJournalEntries.length < 5) {
    insights.push("Add more journal entries to unlock behavioral pattern insights.");
  }

  res.json({
    emotionStats,
    topWinEmotion,
    topLossEmotion,
    insights: insights.slice(0, 6),
    entryTypeBreakdown,
    totalEntries: totalJournalEntries.length,
    totalPositionsWithJournal: uniqueJournaledPositions,
  });
});

export { router as analyticsRouter };
