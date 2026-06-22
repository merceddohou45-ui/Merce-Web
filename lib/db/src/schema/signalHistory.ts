import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalHistoryTable = pgTable("signal_history", {
  id: serial("id").primaryKey(),
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
  reason: text("reason"),
  status: text("status").notNull().default("active"),
  profitLoss: numeric("profit_loss", { precision: 15, scale: 2 }),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const insertSignalHistorySchema = createInsertSchema(signalHistoryTable).omit({ id: true, generatedAt: true });
export type InsertSignalHistory = z.infer<typeof insertSignalHistorySchema>;
export type SignalHistory = typeof signalHistoryTable.$inferSelect;
