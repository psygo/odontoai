import { date, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appointments } from "./appointments";
import { clinics } from "./clinics";
import { patients } from "./patients";

export const paymentMethod = pgEnum("payment_method", [
  "pix",
  "boleto",
  "credit_card",
  "debit_card",
  "cash",
  "other",
]);

export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "overdue", "cancelled"]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  // Stored in cents (BRL) to avoid floating point rounding errors.
  amountCents: integer("amount_cents").notNull(),
  method: paymentMethod("method").notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  description: text("description"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
