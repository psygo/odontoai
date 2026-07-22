import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists, patients, prescriptions } from "@/db/schema";
import { PrescriptionsPageClient, type PrescriptionRow } from "./prescriptions-page-client";

export default async function PrescriptionsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [prescriptionRows, patientRows, dentistRows] = await Promise.all([
    db.query.prescriptions.findMany({
      where: eq(prescriptions.clinicId, clinicId),
      with: { patient: true, dentist: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
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

  const rows: PrescriptionRow[] = prescriptionRows.map((rx) => ({
    id: rx.id,
    patientId: rx.patientId,
    patientName: rx.patient.name,
    dentistId: rx.dentistId,
    dentistName: rx.dentist.name,
    content: rx.content,
    status: rx.status,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-strong">Receitas</h1>

      <p className="max-w-2xl text-sm text-ink-faint">
        Assinar uma receita a torna final e imutável — só então ela fica disponível para a assistente de WhatsApp
        encaminhar ao paciente, sempre exatamente como escrita aqui, nunca reescrita pela IA.
      </p>

      <PrescriptionsPageClient prescriptions={rows} patients={patientRows} dentists={dentistRows} />
    </div>
  );
}
