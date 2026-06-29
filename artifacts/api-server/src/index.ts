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

// ─── Ensure all database tables exist (idempotent, runs on every startup) ─────
async function ensureAllTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trading_profiles (
        id SERIAL PRIMARY KEY,
        capital NUMERIC(15,2) NOT NULL,
        profit_target NUMERIC(15,2) NOT NULL,
        profit_target_percent NUMERIC(8,2),
        risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
        timeframe TEXT NOT NULL DEFAULT 'M5',
        broker TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trading_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform_name TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_password TEXT,
        capital NUMERIC(15,2) NOT NULL,
        profit_target NUMERIC(15,2) NOT NULL,
        risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
        timeframe TEXT NOT NULL DEFAULT 'H1',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS signal_history (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry NUMERIC(20,8) NOT NULL,
        stop_loss NUMERIC(20,8) NOT NULL,
        take_profit1 NUMERIC(20,8) NOT NULL,
        take_profit2 NUMERIC(20,8) NOT NULL,
        take_profit3 NUMERIC(20,8) NOT NULL,
        timeframe TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        risk_percent NUMERIC(8,2) NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        profit_loss NUMERIC(15,2),
        generated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS portfolio_positions (
        id SERIAL PRIMARY KEY,
        signal_id INTEGER REFERENCES signal_history(id),
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry NUMERIC(20,8) NOT NULL,
        stop_loss NUMERIC(20,8) NOT NULL,
        take_profit1 NUMERIC(20,8) NOT NULL,
        take_profit2 NUMERIC(20,8) NOT NULL,
        take_profit3 NUMERIC(20,8) NOT NULL,
        timeframe TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        risk_percent NUMERIC(8,2) NOT NULL,
        lot_size NUMERIC(10,4) NOT NULL DEFAULT 0.01,
        capital_at_open NUMERIC(15,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        close_reason TEXT,
        close_price NUMERIC(20,8),
        realized_pnl NUMERIC(15,2),
        unrealized_pnl NUMERIC(15,2),
        tp_hit TEXT,
        is_partial_close BOOLEAN DEFAULT FALSE,
        opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        position_id INTEGER NOT NULL REFERENCES portfolio_positions(id) ON DELETE CASCADE,
        entry_type TEXT NOT NULL DEFAULT 'note',
        emotion TEXT,
        reasoning TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS broker_sessions (
        id SERIAL PRIMARY KEY,
        broker TEXT NOT NULL,
        api_key TEXT NOT NULL,
        api_key_masked TEXT NOT NULL,
        account_id TEXT,
        balance NUMERIC(15,2),
        currency TEXT,
        connected BOOLEAN NOT NULL DEFAULT TRUE,
        connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        disconnected_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON user_sessions ("expire");
    `);
    logger.info("Toutes les tables vérifiées / créées");
  } catch (err) {
    logger.error({ err }, "Erreur création tables");
    throw err;
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
  await ensureAllTables();

  server.listen(port, () => {
    logger.info({ port, wsPath: WS_PATH }, "Serveur démarré avec support WebSocket");
    setInterval(() => { autoScan().catch((err) => logger.error({ err }, "autoScan failure")); }, SCAN_INTERVAL_MS);
  });
}

start().catch((err) => {
  logger.error({ err }, "Erreur démarrage serveur");
  process.exit(1);
});
