import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { portfolioPositionTable } from "./portfolioPosition";

export const journalEntryTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id")
    .notNull()
    .references(() => portfolioPositionTable.id, { onDelete: "cascade" }),
  entryType: text("entry_type").notNull().default("note"),
  emotion: text("emotion"),
  reasoning: text("reasoning"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type JournalEntry = typeof journalEntryTable.$inferSelect;
