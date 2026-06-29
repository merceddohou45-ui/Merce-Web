import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { generateSignals } from "./lib/marketEngine";
import { db, tradingAccountTable, signalHistoryTable, portfolioPositionTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { sendPushNotification } from "./routes/push";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// ─── Ensure user_sessions table exists (connect-pg-simple v10 createTableIfMissing is unreliable) ─
async function ensureSessionTable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      ) WITH (OIDS=FALSE);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON user_sessions ("expire");
    `);
    logger.info("Table user_sessions vérifiée / créée");
  } catch (err) {
    logger.error({ err }, "Erreur création table user_sessions");
  } finally {
    client.release();
  }
}

const server = http.createServer(app);

// ─── WebSocket server ─────────────────────────────────────────────────────────
// Path must match the API Server preview path prefix so the Replit proxy can route it
const WS_PATH = "/api/ws/live-signals";
const wss = new WebSocketServer({ server, path: WS_PATH });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  logger.info({ clientCount: clients.size }, "WebSocket client connecté");

  ws.on("close", () => {
    clients.delete(ws);
    logger.info({ clientCount: clients.size }, "WebSocket client déconnecté");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket erreur");
    clients.delete(ws);
  });

  ws.send(JSON.stringify({ type: "connected", message: "Flux de signaux en direct actif" }));
});

function broadcast(data: unknown): void {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ─── Auto-scan (every 30 s) ───────────────────────────────────────────────────
async function autoScan(): Promise<void> {
  try {
    if (clients.size === 0) return;

    const accounts = await db
      .select()
      .from(tradingAccountTable)
      .orderBy(desc(tradingAccountTable.createdAt))
      .limit(10);

    if (accounts.length === 0) return;

    const account = accounts[0]!;

    const openPositions = await db
      .select({ symbol: portfolioPositionTable.symbol })
      .from(portfolioPositionTable)
      .where(eq(portfolioPositionTable.status, "open"));

    const openSymbols = openPositions.map((p) => p.symbol);

    const capital = parseFloat(account.capital);
    const riskLevel = (account.riskLevel ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";
    const timeframe = account.timeframe ?? "H1";

    const signals = await generateSignals(account.platformName, riskLevel, timeframe, capital, openSymbols);

    if (signals.length === 0) return;

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
    logger.info({ symbol: selected.symbol, direction: selected.direction }, "Signal diffusé");

    // Push notification to all subscribed devices
    const dirLabel = selected.direction === "BUY" ? "📈 ACHAT" : "📉 VENTE";
    sendPushNotification({
      title: `${dirLabel} — ${selected.symbol}`,
      body: `Entrée: ${selected.entry.toFixed(5)} | Confiance: ${selected.confidence}% | TF: ${selected.timeframe}`,
      tag: `signal-${selected.symbol}`,
      url: "/dashboard",
    }).catch(() => { /* ignore push errors */ });
  } catch (err) {
    logger.error({ err }, "Erreur scan automatique");
  }
}

const SCAN_INTERVAL_MS = 30_000;

// ─── Start ────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await ensureSessionTable();

  server.listen(port, () => {
    logger.info({ port, wsPath: WS_PATH }, "Serveur démarré avec support WebSocket");
    setInterval(() => { autoScan().catch((err) => logger.error({ err }, "autoScan failure")); }, SCAN_INTERVAL_MS);
  });
}

start().catch((err) => {
  logger.error({ err }, "Erreur démarrage serveur");
  process.exit(1);
});
