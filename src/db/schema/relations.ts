import { relations } from "drizzle-orm";
import { appointments } from "./appointments";
import { clinics } from "./clinics";
import { dentists } from "./dentists";
import { patients } from "./patients";
import { payments } from "./payments";

export const clinicsRelations = relations(clinics, ({ many }) => ({
  dentists: many(dentists),
  patients: many(patients),
  appointments: many(appointments),
  payments: many(payments),
}));

export const dentistsRelations = relations(dentists, ({ one, many }) => ({
  clinic: one(clinics, { fields: [dentists.clinicId], references: [clinics.id] }),
  appointments: many(appointments),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, { fields: [patients.clinicId], references: [clinics.id] }),
  appointments: many(appointments),
  payments: many(payments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  clinic: one(clinics, { fields: [appointments.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  dentist: one(dentists, { fields: [appointments.dentistId], references: [dentists.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  clinic: one(clinics, { fields: [payments.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [payments.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [payments.appointmentId], references: [appointments.id] }),
}));
