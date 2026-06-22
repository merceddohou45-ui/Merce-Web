import { pgTable, serial, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradingProfileTable = pgTable("trading_profiles", {
  id: serial("id").primaryKey(),
  capital: numeric("capital", { precision: 15, scale: 2 }).notNull(),
  profitTarget: numeric("profit_target", { precision: 15, scale: 2 }).notNull(),
  profitTargetPercent: numeric("profit_target_percent", { precision: 8, scale: 2 }),
  riskLevel: text("risk_level").notNull().default("MEDIUM"),
  timeframe: text("timeframe").notNull().default("M5"),
  broker: text("broker"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertTradingProfileSchema = createInsertSchema(tradingProfileTable).omit({ id: true, createdAt: true });
export type InsertTradingProfile = z.infer<typeof insertTradingProfileSchema>;
export type TradingProfile = typeof tradingProfileTable.$inferSelect;
