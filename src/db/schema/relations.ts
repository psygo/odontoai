import { relations } from "drizzle-orm";
import { clinics } from "./clinics";
import { conversations, messages } from "./conversations";
import { customers } from "./customers";
import { paymentReceipts } from "./payment-receipts";
import { payments } from "./payments";

export const clinicsRelations = relations(clinics, ({ many }) => ({
  customers: many(customers),
  payments: many(payments),
  paymentReceipts: many(paymentReceipts),
  conversations: many(conversations),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  clinic: one(clinics, { fields: [customers.clinicId], references: [clinics.id] }),
  payments: many(payments),
  paymentReceipts: many(paymentReceipts),
  conversations: many(conversations),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  clinic: one(clinics, { fields: [payments.clinicId], references: [clinics.id] }),
  customer: one(customers, { fields: [payments.customerId], references: [customers.id] }),
  receipts: many(paymentReceipts),
}));

export const paymentReceiptsRelations = relations(paymentReceipts, ({ one }) => ({
  clinic: one(clinics, { fields: [paymentReceipts.clinicId], references: [clinics.id] }),
  customer: one(customers, { fields: [paymentReceipts.customerId], references: [customers.id] }),
  payment: one(payments, { fields: [paymentReceipts.paymentId], references: [payments.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  clinic: one(clinics, { fields: [conversations.clinicId], references: [clinics.id] }),
  customer: one(customers, { fields: [conversations.customerId], references: [customers.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));
