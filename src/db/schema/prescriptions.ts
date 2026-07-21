import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";
import { dentists } from "./dentists";
import { patients } from "./patients";

// draft: dentist is still writing it, never visible/sendable to the patient.
// signed: final and immutable — the only status the WhatsApp agent may forward.
export const prescriptionStatus = pgEnum("prescription_status", ["draft", "signed"]);

export const prescriptions = pgTable("prescriptions", {
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
  status: prescriptionStatus("status").notNull().default("draft"),
  // Full prescription text exactly as the dentist wrote it. The WhatsApp agent
  // forwards this verbatim and never generates, paraphrases, or summarizes it.
  content: text("content").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
