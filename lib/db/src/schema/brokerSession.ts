import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brokerSessionTable = pgTable("broker_sessions", {
  id: serial("id").primaryKey(),
  broker: text("broker").notNull(),
  apiKey: text("api_key").notNull(),
  apiKeyMasked: text("api_key_masked").notNull(),
  accountId: text("account_id"),
  balance: numeric("balance", { precision: 15, scale: 2 }),
  currency: text("currency"),
  connected: boolean("connected").notNull().default(true),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  disconnectedAt: timestamp("disconnected_at"),
});

export const insertBrokerSessionSchema = createInsertSchema(brokerSessionTable).omit({ id: true, connectedAt: true });
export type InsertBrokerSession = z.infer<typeof insertBrokerSessionSchema>;
export type BrokerSession = typeof brokerSessionTable.$inferSelect;
