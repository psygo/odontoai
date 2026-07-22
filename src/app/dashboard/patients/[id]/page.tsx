import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { PatientProfileClient } from "../patient-profile-client";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, id), eq(patients.clinicId, clinicId)),
    with: {
      appointments: { with: { dentist: true }, orderBy: (a, { desc }) => [desc(a.startsAt)] },
      payments: { orderBy: (p, { desc }) => [desc(p.createdAt)] },
      prescriptions: { with: { dentist: true }, orderBy: (p, { desc }) => [desc(p.createdAt)] },
    },
  });

  if (!patient) {
    notFound();
  }

  const sinceDate = patient.appointments.length
    ? patient.appointments[patient.appointments.length - 1].startsAt
    : patient.createdAt;

  return (
    <PatientProfileClient
      patient={{
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        cpf: patient.cpf,
        birthDate: patient.birthDate,
        email: patient.email,
        notes: patient.notes,
        sinceLabel: sinceDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      }}
      appointments={patient.appointments.map((a) => ({
        id: a.id,
        service: a.service,
        status: a.status,
        dateLabel: a.startsAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        timeLabel: a.startsAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
        dentistName: a.dentist.name,
      }))}
      payments={patient.payments.map((p) => ({
        id: p.id,
        appointmentId: p.appointmentId,
        amountCents: p.amountCents,
        method: p.method,
        status: p.status,
        description: p.description,
        dueDate: p.dueDate,
      }))}
      prescriptions={patient.prescriptions.map((rx) => ({
        id: rx.id,
        status: rx.status,
        dateLabel: rx.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        dentistName: rx.dentist.name,
        excerpt: rx.content.length > 60 ? `${rx.content.slice(0, 60)}…` : rx.content,
      }))}
    />
  );
}
