import { pgTable, date, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { clinics } from "./clinics";

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // E.164 format (e.g. +5511999999999); this is how the WhatsApp AI identifies a patient.
    phone: text("phone").notNull(),
    cpf: text("cpf"),
    birthDate: date("birth_date"),
    email: text("email"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patients_clinic_phone_idx").on(table.clinicId, table.phone)],
);
