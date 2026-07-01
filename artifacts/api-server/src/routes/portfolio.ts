import { Router, type IRouter } from "express";
import { db, portfolioPositionTable, signalHistoryTable, tradingAccountTable } from "@workspace/db";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import {
  OpenPositionFromSignalBody,
  ClosePositionBody,
  GetPortfolioPositionsResponse,
  OpenPositionFromSignalResponse,
  ClosePositionResponse,
  GetPortfolioSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseNum(v: string | null | undefined): number {
  return v ? parseFloat(v) : 0;
}

function computeLotSize(capital: number, riskPercent: number, entry: number, stopLoss: number): number {
  const riskAmount = capital * (riskPercent / 100);
  const priceDiff = Math.abs(entry - stopLoss);
  if (priceDiff === 0) return 0.01;
  // Lot size = risk amount / (price diff per lot)
  // Approximate: 1 standard lot = 100,000 units; pip value varies
  // Simplified formula that works across asset classes
  const rawLot = riskAmount / (priceDiff * 1000);
  return Math.max(0.01, parseFloat(rawLot.toFixed(2)));
}

function mapPosition(p: typeof portfolioPositionTable.$inferSelect) {
  return {
    id: p.id,
    signalId: p.signalId,
    symbol: p.symbol,
    direction: p.direction,
    entry: parseNum(p.entry),
    stopLoss: parseNum(p.stopLoss),
    takeProfit1: parseNum(p.takeProfit1),
    takeProfit2: parseNum(p.takeProfit2),
    takeProfit3: parseNum(p.takeProfit3),
    timeframe: p.timeframe,
    confidence: p.confidence,
    riskPercent: parseNum(p.riskPercent),
    lotSize: parseNum(p.lotSize),
    capitalAtOpen: parseNum(p.capitalAtOpen),
    status: p.status,
    closeReason: p.closeReason,
    closePrice: p.closePrice ? parseNum(p.closePrice) : null,
    realizedPnl: p.realizedPnl ? parseNum(p.realizedPnl) : null,
    unrealizedPnl: p.unrealizedPnl ? parseNum(p.unrealizedPnl) : null,
    tpHit: p.tpHit,
    isPartialClose: p.isPartialClose,
    openedAt: p.openedAt.toISOString(),
    closedAt: p.closedAt?.toISOString() ?? null,
  };
}

// GET /portfolio/positions
router.get("/portfolio/positions", async (req, res): Promise<void> => {
  const positions = await db
    .select()
    .from(portfolioPositionTable)
    .orderBy(desc(portfolioPositionTable.openedAt));

  res.json(GetPortfolioPositionsResponse.parse(positions.map(mapPosition)));
});

// POST /portfolio/open-from-signal
router.post("/portfolio/open-from-signal", async (req, res): Promise<void> => {
  const parsed = OpenPositionFromSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { signalId, lotSize: overrideLot } = parsed.data;

  const [signal] = await db
    .select()
    .from(signalHistoryTable)
    .where(eq(signalHistoryTable.id, signalId));

  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }

  // Read capital from the user's trading account (tradingAccountTable is source of truth)
  const account = req.session?.userId
    ? (await db.select().from(tradingAccountTable).where(eq(tradingAccountTable.userId, req.session.userId)).limit(1))[0]
    : (await db.select().from(tradingAccountTable).orderBy(desc(tradingAccountTable.createdAt)).limit(1))[0];

  const capital = account ? parseNum(account.capital) : 10000;

  // Compute current equity from closed positions
  const closedPositions = await db
    .select()
    .from(portfolioPositionTable)
    .where(and(isNotNull(portfolioPositionTable.realizedPnl)));

  const totalPnl = closedPositions.reduce((sum, p) => sum + parseNum(p.realizedPnl), 0);
  const currentEquity = capital + totalPnl;

  const entry = parseNum(signal.entry);
  const stopLoss = parseNum(signal.stopLoss);
  const riskPercent = parseNum(signal.riskPercent);
  const lotSize = overrideLot ?? computeLotSize(currentEquity, riskPercent, entry, stopLoss);

  const [position] = await db
    .insert(portfolioPositionTable)
    .values({
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      entry: entry.toString(),
      stopLoss: stopLoss.toString(),
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      takeProfit3: signal.takeProfit3,
      timeframe: signal.timeframe,
      confidence: signal.confidence,
      riskPercent: riskPercent.toString(),
      lotSize: lotSize.toString(),
      capitalAtOpen: currentEquity.toString(),
      status: "open",
    })
    .returning();

  req.log.info({ positionId: position.id, symbol: position.symbol }, "Position opened");

  res.json(OpenPositionFromSignalResponse.parse(mapPosition(position)));
});

// POST /portfolio/close/:id
router.post("/portfolio/close/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid position id" });
    return;
  }

  const parsed = ClosePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { closeReason, closePrice } = parsed.data;

  const [position] = await db
    .select()
    .from(portfolioPositionTable)
    .where(eq(portfolioPositionTable.id, id));

  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }
  if (position.status !== "open") {
    res.status(400).json({ error: "Position is already closed" });
    return;
  }

  const entry = parseNum(position.entry);
  const lotSize = parseNum(position.lotSize);
  const capitalAtOpen = parseNum(position.capitalAtOpen);

  // P&L calculation: simplified pip value model
  const priceDiff = position.direction === "BUY"
    ? closePrice - entry
    : entry - closePrice;

  // Use risk-based P&L: riskPercent of capital = 1 SL distance
  const slDistance = Math.abs(entry - parseNum(position.stopLoss));
  const realizedPnl = slDistance > 0
    ? (priceDiff / slDistance) * (capitalAtOpen * parseNum(position.riskPercent) / 100)
    : priceDiff * lotSize * 1000;

  const statusMap: Record<string, string> = {
    TP1: "closed_tp1",
    TP2: "closed_tp2",
    TP3: "closed_tp3",
    SL: "closed_sl",
    MANUAL: "closed_manual",
  };

  const tpHit = ["TP1", "TP2", "TP3"].includes(closeReason) ? closeReason : null;
  const newStatus = statusMap[closeReason] ?? "closed_manual";

  const [updated] = await db
    .update(portfolioPositionTable)
    .set({
      status: newStatus,
      closeReason,
      closePrice: closePrice.toString(),
      realizedPnl: realizedPnl.toFixed(2),
      tpHit,
      closedAt: new Date(),
    })
    .where(eq(portfolioPositionTable.id, id))
    .returning();

  // Update the linked signal status
  if (position.signalId) {
    const signalStatus = tpHit ? "won" : closeReason === "SL" ? "lost" : "closed";
    await db
      .update(signalHistoryTable)
      .set({ status: signalStatus, profitLoss: realizedPnl.toFixed(2) })
      .where(eq(signalHistoryTable.id, position.signalId));
  }

  req.log.info({ positionId: id, pnl: realizedPnl.toFixed(2) }, "Position closed");

  res.json(ClosePositionResponse.parse(mapPosition(updated)));
});

// GET /portfolio/summary
router.get("/portfolio/summary", async (req, res): Promise<void> => {
  // Read capital from the user's trading account (tradingAccountTable is source of truth)
  const account = req.session?.userId
    ? (await db.select().from(tradingAccountTable).where(eq(tradingAccountTable.userId, req.session.userId)).limit(1))[0]
    : (await db.select().from(tradingAccountTable).orderBy(desc(tradingAccountTable.createdAt)).limit(1))[0];

  const startingCapital = account ? parseNum(account.capital) : 10000;
  const profitTarget = account ? parseNum(account.profitTarget) : startingCapital * 1.2;
  const profitTargetPercent = ((profitTarget - startingCapital) / startingCapital) * 100;

  const allPositions = await db
    .select()
    .from(portfolioPositionTable)
    .orderBy(portfolioPositionTable.openedAt);

  const closed = allPositions.filter((p) => p.status !== "open");
  const open = allPositions.filter((p) => p.status === "open");

  const totalPnl = closed.reduce((sum, p) => sum + parseNum(p.realizedPnl), 0);
  const currentEquity = startingCapital + totalPnl;
  const totalPnlPercent = (totalPnl / startingCapital) * 100;
  const targetProgress = Math.min(100, Math.max(0, (totalPnl / (profitTarget - startingCapital)) * 100));

  const winners = closed.filter((p) => parseNum(p.realizedPnl) > 0);
  const losers = closed.filter((p) => parseNum(p.realizedPnl) <= 0);
  const winRate = closed.length > 0 ? (winners.length / closed.length) * 100 : 0;

  // Average R:R achieved
  const avgRr =
    winners.length > 0
      ? winners.reduce((sum, p) => {
          const slDist = Math.abs(parseNum(p.entry) - parseNum(p.stopLoss));
          const pnlPips = Math.abs(parseFloat((p.closePrice ?? p.entry) as string) - parseNum(p.entry));
          return sum + (slDist > 0 ? pnlPips / slDist : 1.5);
        }, 0) / winners.length
      : 0;

  const pnls = closed.map((p) => parseNum(p.realizedPnl));
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

  // Build equity curve — group by day
  const equityMap = new Map<string, { equity: number; pnl: number; count: number }>();
  let runningEquity = startingCapital;

  // Seed the starting point
  const today = new Date();
  const startDate = new Date(account?.createdAt ?? today);
  startDate.setDate(startDate.getDate() - 1);
  equityMap.set(startDate.toISOString().split("T")[0]!, {
    equity: startingCapital,
    pnl: 0,
    count: 0,
  });

  for (const pos of closed) {
    const day = pos.closedAt?.toISOString().split("T")[0] ?? today.toISOString().split("T")[0];
    const pnl = parseNum(pos.realizedPnl);
    runningEquity += pnl;
    const existing = equityMap.get(day!);
    equityMap.set(day!, {
      equity: runningEquity,
      pnl: (existing?.pnl ?? 0) + pnl,
      count: (existing?.count ?? 0) + 1,
    });
  }

  // Also add today if not present
  const todayStr = today.toISOString().split("T")[0]!;
  if (!equityMap.has(todayStr)) {
    equityMap.set(todayStr, { equity: currentEquity, pnl: 0, count: 0 });
  }

  const equityCurve = Array.from(equityMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      equity: parseFloat(v.equity.toFixed(2)),
      pnl: parseFloat(v.pnl.toFixed(2)),
      positionsClosed: v.count,
    }));

  res.json(
    GetPortfolioSummaryResponse.parse({
      startingCapital,
      currentEquity: parseFloat(currentEquity.toFixed(2)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      totalPnlPercent: parseFloat(totalPnlPercent.toFixed(2)),
      profitTarget,
      profitTargetPercent: parseFloat(profitTargetPercent.toFixed(2)),
      targetProgress: parseFloat(targetProgress.toFixed(1)),
      openPositions: open.length,
      closedPositions: closed.length,
      winRate: parseFloat(winRate.toFixed(1)),
      avgRr: parseFloat(avgRr.toFixed(2)),
      bestTrade: parseFloat(bestTrade.toFixed(2)),
      worstTrade: parseFloat(worstTrade.toFixed(2)),
      equityCurve,
    })
  );
});

export default router;
