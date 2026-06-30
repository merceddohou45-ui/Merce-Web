import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { generateSignalForAsset, generateSignals, getBrokerAssets } from "./lib/marketEngine";
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

// ─── Signal deduplication: 60-min cooldown per symbol ────────────────────────
const signalCooldowns = new Map<string, number>(); // symbol → last broadcast timestamp
const SIGNAL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// ─── Asset rotation state ─────────────────────────────────────────────────────
let assetRotationIndex = 0;

// ─── Auto-scan (every 45 s) — analyzes ONE asset per cycle (multi-TF) ────────
async function autoScan(): Promise<void> {
  try {
    if (clients.size === 0) return;

    const accounts = await db
      .select()
      .from(tradingAccountTable)
      .orderBy(desc(tradingAccountTable.createdAt))
      .limit(1);

    if (accounts.length === 0) return;

    const account = accounts[0]!;
    const riskLevel = (account.riskLevel ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH";

    const openPositions = await db
      .select({ symbol: portfolioPositionTable.symbol })
      .from(portfolioPositionTable)
      .where(eq(portfolioPositionTable.status, "open"));

    const openSymbols = new Set(openPositions.map((p) => p.symbol));

    // Get full asset list for this broker
    const assets = getBrokerAssets(account.platformName).filter((a) => !openSymbols.has(a.symbol));
    if (assets.length === 0) return;

    // Pick one asset (rotating) and analyze it with multi-timeframe
    const idx = assetRotationIndex % assets.length;
    assetRotationIndex = (assetRotationIndex + 1) % assets.length;
    const asset = assets[idx]!;

    // Skip if within cooldown window (avoid duplicate signals for the same symbol)
    const lastSignalAt = signalCooldowns.get(asset.symbol) ?? 0;
    if (Date.now() - lastSignalAt < SIGNAL_COOLDOWN_MS) {
      logger.info(
        { symbol: asset.symbol, cooldownRemainingMin: Math.round((SIGNAL_COOLDOWN_MS - (Date.now() - lastSignalAt)) / 60000) },
        "⏳ Symbol en cooldown — analyse ignorée"
      );
      return;
    }

    logger.info({ symbol: asset.symbol }, "🔍 Auto-scan multi-timeframe");
    const signal = await generateSignalForAsset(asset, riskLevel);

    if (!signal) return; // conditions not met or confidence < 90%

    // Persist to DB
    const [saved] = await db.insert(signalHistoryTable).values({
      symbol:      signal.symbol,
      direction:   signal.direction,
      entry:       signal.entry.toString(),
      stopLoss:    signal.stopLoss.toString(),
      takeProfit1: signal.takeProfit1.toString(),
      takeProfit2: signal.takeProfit2.toString(),
      takeProfit3: signal.takeProfit3.toString(),
      timeframe:   signal.timeframe,
      confidence:  signal.confidence,
      riskPercent: signal.riskPercent.toString(),
      reason:      signal.reason,
      status:      "active",
    }).returning();

    // Mark cooldown
    signalCooldowns.set(asset.symbol, Date.now());

    // Broadcast via WebSocket
    broadcast({ type: "signal", data: { ...signal, dbId: saved!.id } });
    logger.info(
      { symbol: signal.symbol, direction: signal.direction, confidence: signal.confidence },
      "📡 Signal haute qualité diffusé"
    );

    // Push notification
    const dirLabel = signal.direction === "BUY" ? "📈 ACHAT" : "📉 VENTE";
    sendPushNotification({
      title: `${dirLabel} — ${signal.symbol}`,
      body:  `Entrée: ${signal.entry.toFixed(5)} | Confiance: ${signal.confidence}% | TF: M1/M5/M15/H1`,
      tag:   `signal-${signal.symbol}`,
      url:   "/dashboard",
    }).catch(() => { /* ignore push errors */ });

  } catch (err) {
    logger.error({ err }, "Erreur scan automatique");
  }
}

const SCAN_INTERVAL_MS = 45_000; // 45s: one asset per cycle, 4 TF fetches each

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
