import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { dentists } from "./dentists";
import { patients } from "./patients";

export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  dentistId: uuid("dentist_id")
    .notNull()
    .references(() => dentists.id, { onDelete: "restrict" }),
  status: appointmentStatus("status").notNull().default("scheduled"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  // Free text, not an enum — nullable since older rows predate this field.
  // Drives the price lookup in src/lib/services.ts for generating a billing
  // entry from a completed appointment.
  service: text("service"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
