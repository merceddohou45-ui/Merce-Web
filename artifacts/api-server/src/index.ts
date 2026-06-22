import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { generateSignals } from "./lib/marketEngine";
import { db, brokerSessionTable, signalHistoryTable, tradingProfileTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

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

  // Send welcome message
  ws.send(JSON.stringify({ type: "connected", message: "Live signals stream active" }));
});

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Auto-scan every 8 seconds and broadcast signals
async function autoScan() {
  try {
    if (clients.size === 0) return;

    const [session] = await db
      .select()
      .from(brokerSessionTable)
      .where(eq(brokerSessionTable.connected, true))
      .orderBy(desc(brokerSessionTable.connectedAt))
      .limit(1);

    if (!session) return;

    const [profile] = await db
      .select()
      .from(tradingProfileTable)
      .orderBy(desc(tradingProfileTable.createdAt))
      .limit(1);

    const riskLevel = (profile?.riskLevel ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";
    const timeframe = profile?.timeframe ?? "M5";

    const signals = generateSignals(session.broker, riskLevel, timeframe);

    if (signals.length === 0) return;

    // Pick 1-2 signals to broadcast per scan cycle to simulate live feed
    const count = Math.floor(Math.random() * 2) + 1;
    const selected = signals.sort(() => Math.random() - 0.5).slice(0, count);

    for (const signal of selected) {
      // Save to history
      await db.insert(signalHistoryTable).values({
        symbol: signal.symbol,
        direction: signal.direction,
        entry: signal.entry.toString(),
        stopLoss: signal.stopLoss.toString(),
        takeProfit1: signal.takeProfit1.toString(),
        takeProfit2: signal.takeProfit2.toString(),
        takeProfit3: signal.takeProfit3.toString(),
        timeframe: signal.timeframe,
        confidence: signal.confidence,
        riskPercent: signal.riskPercent.toString(),
        reason: signal.reason,
        status: "active",
      });

      broadcast({ type: "signal", data: signal });
    }

    logger.debug({ count: selected.length }, "Broadcast live signals");
  } catch (err) {
    logger.error({ err }, "Auto-scan error");
  }
}

// Start scanning interval
const SCAN_INTERVAL_MS = 8000;
setInterval(autoScan, SCAN_INTERVAL_MS);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening with WebSocket support");
});
