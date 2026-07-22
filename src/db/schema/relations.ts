import { relations } from "drizzle-orm";
import { appointments } from "./appointments";
import { clinics } from "./clinics";
import { dentists } from "./dentists";
import { paymentReceipts } from "./payment-receipts";
import { patients } from "./patients";
import { payments } from "./payments";
import { prescriptions } from "./prescriptions";

export const clinicsRelations = relations(clinics, ({ many }) => ({
  dentists: many(dentists),
  patients: many(patients),
  appointments: many(appointments),
  payments: many(payments),
  prescriptions: many(prescriptions),
  paymentReceipts: many(paymentReceipts),
}));

export const dentistsRelations = relations(dentists, ({ one, many }) => ({
  clinic: one(clinics, { fields: [dentists.clinicId], references: [clinics.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, { fields: [patients.clinicId], references: [clinics.id] }),
  appointments: many(appointments),
  payments: many(payments),
  prescriptions: many(prescriptions),
  paymentReceipts: many(paymentReceipts),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  clinic: one(clinics, { fields: [appointments.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  dentist: one(dentists, { fields: [appointments.dentistId], references: [dentists.id] }),
  paymentReceipts: many(paymentReceipts),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  clinic: one(clinics, { fields: [payments.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [payments.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [payments.appointmentId], references: [appointments.id] }),
  receipts: many(paymentReceipts),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  clinic: one(clinics, { fields: [prescriptions.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  dentist: one(dentists, { fields: [prescriptions.dentistId], references: [dentists.id] }),
}));

export const paymentReceiptsRelations = relations(paymentReceipts, ({ one }) => ({
  clinic: one(clinics, { fields: [paymentReceipts.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [paymentReceipts.patientId], references: [patients.id] }),
  appointment: one(appointments, { fields: [paymentReceipts.appointmentId], references: [appointments.id] }),
  payment: one(payments, { fields: [paymentReceipts.paymentId], references: [payments.id] }),
}));
