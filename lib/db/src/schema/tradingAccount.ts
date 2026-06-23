import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { userTable } from "./user";

export const tradingAccountTable = pgTable("trading_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userTable.id, { onDelete: "cascade" }),
  platformName: text("platform_name").notNull(),
  accountId: text("account_id").notNull(),
  accountPassword: text("account_password"),
  capital: numeric("capital", { precision: 15, scale: 2 }).notNull(),
  profitTarget: numeric("profit_target", { precision: 15, scale: 2 }).notNull(),
  riskLevel: text("risk_level").notNull().default("MEDIUM"),
  timeframe: text("timeframe").notNull().default("H1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type TradingAccount = typeof tradingAccountTable.$inferSelect;
