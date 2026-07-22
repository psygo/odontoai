import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { PatientsPageClient, type PatientRow } from "./patients-page-client";

export default async function PatientsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [patientRows, appointmentRows] = await Promise.all([
    db.query.patients.findMany({ where: eq(patients.clinicId, clinicId), orderBy: (p, { asc }) => [asc(p.name)] }),
    db.query.appointments.findMany({
      where: eq(appointments.clinicId, clinicId),
      columns: { patientId: true, startsAt: true },
    }),
  ]);

  const visitsByPatient = new Map<string, Date[]>();
  for (const appointment of appointmentRows) {
    const list = visitsByPatient.get(appointment.patientId) ?? [];
    list.push(appointment.startsAt);
    visitsByPatient.set(appointment.patientId, list);
  }

  const rows: PatientRow[] = patientRows.map((p) => {
    const visits = visitsByPatient.get(p.id) ?? [];
    const lastVisit = visits.length ? visits.reduce((a, b) => (a > b ? a : b)) : null;
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      visitCount: visits.length,
      lastVisitLabel: lastVisit ? lastVisit.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-strong">Pacientes</h1>
      <PatientsPageClient patients={rows} />
    </div>
  );
}
