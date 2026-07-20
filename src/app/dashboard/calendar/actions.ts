"use server";

import { and, eq, gte, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointmentStatus, appointments, dentists, patients } from "@/db/schema";

// Datetime-local inputs (e.g. "2026-07-21T14:00") carry no timezone, and this
// action runs server-side (often UTC on Vercel), not in the dentist's local
// time. Brazil has used a single -03:00 offset nationwide since abolishing DST
// in 2019, so we pin that rather than let it silently parse as UTC.
function parseClinicLocalDateTime(value: string): Date {
  return new Date(`${value}:00-03:00`);
}

export async function createAppointmentAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const patientId = formData.get("patientId");
  const dentistId = formData.get("dentistId");
  const startsAtRaw = formData.get("startsAt");
  const endsAtRaw = formData.get("endsAt");
  const notes = formData.get("notes");

  if (
    typeof patientId !== "string" ||
    !patientId ||
    typeof dentistId !== "string" ||
    !dentistId ||
    typeof startsAtRaw !== "string" ||
    !startsAtRaw ||
    typeof endsAtRaw !== "string" ||
    !endsAtRaw
  ) {
    return "Preencha paciente, dentista e horário.";
  }

  const startsAt = parseClinicLocalDateTime(startsAtRaw);
  const endsAt = parseClinicLocalDateTime(endsAtRaw);
  if (endsAt <= startsAt) {
    return "O horário final deve ser depois do horário inicial.";
  }

  const [patient, dentist] = await Promise.all([
    db.query.patients.findFirst({ where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)) }),
    db.query.dentists.findFirst({ where: and(eq(dentists.id, dentistId), eq(dentists.clinicId, clinicId)) }),
  ]);
  if (!patient || !dentist) {
    return "Paciente ou dentista inválido.";
  }

  const conflict = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.dentistId, dentistId),
      ne(appointments.status, "cancelled"),
      lte(appointments.startsAt, endsAt),
      gte(appointments.endsAt, startsAt),
    ),
  });
  if (conflict) {
    return "Esse dentista já tem uma consulta nesse horário.";
  }

  await db.insert(appointments).values({
    clinicId,
    patientId,
    dentistId,
    startsAt,
    endsAt,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  });

  revalidatePath("/dashboard/calendar");
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) return;

  const appointmentId = formData.get("appointmentId");
  const status = formData.get("status");

  if (
    typeof appointmentId !== "string" ||
    !appointmentId ||
    typeof status !== "string" ||
    !appointmentStatus.enumValues.includes(status as (typeof appointmentStatus.enumValues)[number])
  ) {
    return;
  }

  await db
    .update(appointments)
    .set({ status: status as (typeof appointmentStatus.enumValues)[number] })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, session.user.clinicId)));

  revalidatePath("/dashboard/calendar");
}
