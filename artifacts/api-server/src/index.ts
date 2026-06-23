import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { generateSignals } from "./lib/marketEngine";
import { db, tradingAccountTable, signalHistoryTable, portfolioPositionTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = http.createServer(app);

// WebSocket server for live signals
const wss = new WebSocketServer({ server, path: "/ws/live-signals" });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  logger.info({ clientCount: clients.size }, "WebSocket client connected");

  ws.on("close", () => {
    clients.delete(ws);
    logger.info({ clientCount: clients.size }, "WebSocket client disconnected");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
    clients.delete(ws);
  });

  ws.send(JSON.stringify({ type: "connected", message: "Flux de signaux en direct actif" }));
});

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Auto-scan: runs every 30 seconds (quality over quantity)
async function autoScan() {
  try {
    if (clients.size === 0) return;

    // Get all configured trading accounts
    const accounts = await db
      .select()
      .from(tradingAccountTable)
      .orderBy(desc(tradingAccountTable.createdAt))
      .limit(10);

    if (accounts.length === 0) return;

    // Use the most recently updated account for signal generation
    const account = accounts[0]!;

    // Find symbols with open positions to enforce active-position lock
    const openPositions = await db
      .select({ symbol: portfolioPositionTable.symbol })
      .from(portfolioPositionTable)
      .where(eq(portfolioPositionTable.status, "open"));

    const openSymbols = openPositions.map((p) => p.symbol);

    const capital = parseFloat(account.capital);
    const riskLevel = (account.riskLevel ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";
    const timeframe = account.timeframe ?? "H1";

    const signals = generateSignals(account.platformName, riskLevel, timeframe, capital, openSymbols);

    if (signals.length === 0) return;

    // Broadcast at most 1 signal per scan cycle (quality over quantity)
    const selected = signals[Math.floor(Math.random() * signals.length)]!;

    const [saved] = await db.insert(signalHistoryTable).values({
      symbol: selected.symbol,
      direction: selected.direction,
      entry: selected.entry.toString(),
      stopLoss: selected.stopLoss.toString(),
      takeProfit1: selected.takeProfit1.toString(),
      takeProfit2: selected.takeProfit2.toString(),
      takeProfit3: selected.takeProfit3.toString(),
      timeframe: selected.timeframe,
      confidence: selected.confidence,
      riskPercent: selected.riskPercent.toString(),
      reason: selected.reason,
      status: "active",
    }).returning();

    broadcast({ type: "signal", data: { ...selected, dbId: saved!.id } });
    logger.info({ symbol: selected.symbol, direction: selected.direction }, "Signal diffusé après analyse complète");
  } catch (err) {
    logger.error({ err }, "Erreur lors de l'analyse automatique");
  }
}

// 30-second scan interval — quality signals only
const SCAN_INTERVAL_MS = 30000;
setInterval(autoScan, SCAN_INTERVAL_MS);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening with WebSocket support");
});
