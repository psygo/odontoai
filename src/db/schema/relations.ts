import { relations } from "drizzle-orm";
import { clinicMemberships } from "./clinic-memberships";
import { clinics } from "./clinics";
import { conversations, messages } from "./conversations";
import { customers } from "./customers";
import { paymentReceipts } from "./payment-receipts";
import { payments } from "./payments";
import { users } from "./users";

export const clinicsRelations = relations(clinics, ({ many }) => ({
  customers: many(customers),
  payments: many(payments),
  paymentReceipts: many(paymentReceipts),
  conversations: many(conversations),
  memberships: many(clinicMemberships),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  lastActiveClinic: one(clinics, { fields: [users.lastActiveClinicId], references: [clinics.id] }),
  memberships: many(clinicMemberships),
}));

export const clinicMembershipsRelations = relations(clinicMemberships, ({ one }) => ({
  user: one(users, { fields: [clinicMemberships.userId], references: [users.id] }),
  clinic: one(clinics, { fields: [clinicMemberships.clinicId], references: [clinics.id] }),
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
