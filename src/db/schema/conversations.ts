import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { customers } from "./customers";

export const conversationStatus = pgEnum("conversation_status", ["active", "escalated", "closed"]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  status: conversationStatus("status").notNull().default("active"),
  escalationReason: text("escalation_reason"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageRole = pgEnum("message_role", ["user", "assistant"]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRole("role").notNull(),
  // Anthropic content-block array (text/tool_use/tool_result) — stored as-is so
  // conversation history can be replayed straight back into the Messages API.
  content: jsonb("content").notNull(),
  // Meta's message id (only set on inbound/user messages) — Meta redelivers
  // webhooks it thinks timed out, so this is the idempotency key that stops a
  // slow LLM turn from producing two independent replies to the same message.
  waMessageId: text("wa_message_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
