import { pgTable, serial, integer, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { signalHistoryTable } from "./signalHistory";

export const portfolioPositionTable = pgTable("portfolio_positions", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").references(() => signalHistoryTable.id),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  entry: numeric("entry", { precision: 20, scale: 8 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 20, scale: 8 }).notNull(),
  takeProfit1: numeric("take_profit1", { precision: 20, scale: 8 }).notNull(),
  takeProfit2: numeric("take_profit2", { precision: 20, scale: 8 }).notNull(),
  takeProfit3: numeric("take_profit3", { precision: 20, scale: 8 }).notNull(),
  timeframe: text("timeframe").notNull(),
  confidence: integer("confidence").notNull(),
  riskPercent: numeric("risk_percent", { precision: 8, scale: 2 }).notNull(),
  lotSize: numeric("lot_size", { precision: 10, scale: 4 }).notNull().default("0.01"),
  capitalAtOpen: numeric("capital_at_open", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("open"),
  closeReason: text("close_reason"),
  closePrice: numeric("close_price", { precision: 20, scale: 8 }),
  realizedPnl: numeric("realized_pnl", { precision: 15, scale: 2 }),
  unrealizedPnl: numeric("unrealized_pnl", { precision: 15, scale: 2 }),
  tpHit: text("tp_hit"),
  isPartialClose: boolean("is_partial_close").default(false),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export type PortfolioPosition = typeof portfolioPositionTable.$inferSelect;
