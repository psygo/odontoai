"use server";

import { and, eq, gte, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointmentStatus, appointments, dentists, patients } from "@/db/schema";

// Datetime strings built from separate date + time selects carry no
// timezone, and this action runs server-side (often UTC), not in the
// dentist's local time. Brazil has used a single -03:00 offset nationwide
// since abolishing DST in 2019, so we pin that rather than let it silently
// parse as UTC.
function parseClinicLocalDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00-03:00`);
}

// Handles both create and edit — a single modal/form posts here, with an
// empty `appointmentId` meaning "create a new one".
export async function saveAppointmentAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const appointmentIdRaw = formData.get("appointmentId");
  const patientMode = formData.get("patientMode");
  const patientIdRaw = formData.get("patientId");
  const newPatientName = formData.get("newPatientName");
  const newPatientPhone = formData.get("newPatientPhone");
  const dentistId = formData.get("dentistId");
  const service = formData.get("service");
  const date = formData.get("date");
  const time = formData.get("time");
  const duration = formData.get("duration");
  const notes = formData.get("notes");
  const status = formData.get("status");

  if (typeof dentistId !== "string" || !dentistId) {
    return "Selecione um dentista.";
  }
  if (typeof date !== "string" || !date || typeof time !== "string" || !time) {
    return "Selecione data e horário.";
  }
  const durationMinutes = Number(duration);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return "Duração inválida.";
  }

  let patientId: string;
  if (patientMode === "new") {
    if (typeof newPatientName !== "string" || !newPatientName.trim()) {
      return "Informe o nome do novo paciente.";
    }
    if (typeof newPatientPhone !== "string" || !newPatientPhone.trim()) {
      return "Informe o telefone do novo paciente.";
    }
    const [created] = await db
      .insert(patients)
      .values({ clinicId, name: newPatientName.trim(), phone: newPatientPhone.trim() })
      .returning({ id: patients.id });
    patientId = created.id;
  } else {
    if (typeof patientIdRaw !== "string" || !patientIdRaw) {
      return "Selecione um paciente.";
    }
    patientId = patientIdRaw;
  }

  const [patient, dentist] = await Promise.all([
    db.query.patients.findFirst({ where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)) }),
    db.query.dentists.findFirst({ where: and(eq(dentists.id, dentistId), eq(dentists.clinicId, clinicId)) }),
  ]);
  if (!patient || !dentist) {
    return "Paciente ou dentista inválido.";
  }

  const startsAt = parseClinicLocalDateTime(date, time);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const appointmentId = typeof appointmentIdRaw === "string" && appointmentIdRaw ? appointmentIdRaw : null;

  const conflict = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.dentistId, dentistId),
      ne(appointments.status, "cancelled"),
      lte(appointments.startsAt, endsAt),
      gte(appointments.endsAt, startsAt),
      appointmentId ? ne(appointments.id, appointmentId) : undefined,
    ),
  });
  if (conflict) {
    return "Esse dentista já tem uma consulta nesse horário.";
  }

  const values = {
    clinicId,
    patientId,
    dentistId,
    service: typeof service === "string" && service ? service : null,
    startsAt,
    endsAt,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  };

  if (appointmentId) {
    const statusValue =
      typeof status === "string" && appointmentStatus.enumValues.includes(status as (typeof appointmentStatus.enumValues)[number])
        ? (status as (typeof appointmentStatus.enumValues)[number])
        : undefined;
    await db
      .update(appointments)
      .set({ ...values, ...(statusValue ? { status: statusValue } : {}) })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, clinicId)));
  } else {
    await db.insert(appointments).values(values);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/patients/${patientId}`);
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
}

export async function deleteAppointmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) return;

  const appointmentId = formData.get("appointmentId");
  if (typeof appointmentId !== "string" || !appointmentId) return;

  await db
    .delete(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, session.user.clinicId)));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/appointments");
}
