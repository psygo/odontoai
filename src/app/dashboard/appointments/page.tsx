import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointments, dentists, patients, payments } from "@/db/schema";
import { clinicDateStr, clockLabel, todayInClinicTZ } from "../calendar/grid-math";
import { AppointmentsPageClient, type AppointmentRow } from "./appointments-page-client";

export default async function AppointmentsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [appointmentRows, patientRows, dentistRows] = await Promise.all([
    db.query.appointments.findMany({
      where: eq(appointments.clinicId, clinicId),
      with: { patient: true, dentist: true },
      orderBy: (a, { desc }) => [desc(a.startsAt)],
    }),
    db.query.patients.findMany({
      where: eq(patients.clinicId, clinicId),
      orderBy: (p, { asc }) => [asc(p.name)],
      columns: { id: true, name: true },
    }),
    db.query.dentists.findMany({
      where: eq(dentists.clinicId, clinicId),
      orderBy: (d, { asc }) => [asc(d.name)],
      columns: { id: true, name: true },
    }),
  ]);

  const appointmentIds = appointmentRows.map((a) => a.id);
  const paidAppointmentIds = new Set(
    appointmentIds.length
      ? (
          await db.query.payments.findMany({
            where: and(eq(payments.clinicId, clinicId), inArray(payments.appointmentId, appointmentIds)),
            columns: { appointmentId: true },
          })
        ).map((p) => p.appointmentId)
      : [],
  );

  const rows: AppointmentRow[] = appointmentRows.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    patientName: a.patient.name,
    patientPhone: a.patient.phone,
    dentistId: a.dentistId,
    dentistName: a.dentist.name,
    service: a.service,
    status: a.status,
    dateStr: clinicDateStr(a.startsAt),
    timeStr: clockLabel(a.startsAt),
    durationMinutes: Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60_000),
    notes: a.notes,
    hasPayment: paidAppointmentIds.has(a.id),
  }));

  return (
    <AppointmentsPageClient appointments={rows} patients={patientRows} dentists={dentistRows} todayStr={todayInClinicTZ()} />
  );
}
