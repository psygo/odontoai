import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists, patients, prescriptions } from "@/db/schema";
import { signPrescriptionAction } from "./actions";
import { NewPrescriptionForm } from "./new-prescription-form";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  signed: "Assinada",
};

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Receitas</h1>

      <p className="text-sm text-black/60 max-w-2xl">
        Assinar uma receita a torna final e imutável — só então ela fica disponível para a
        assistente de WhatsApp encaminhar ao paciente, sempre exatamente como escrita aqui, nunca
        reescrita pela IA.
      </p>

      <NewPrescriptionForm patients={patientRows} dentists={dentistRows} />

      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-black/10 text-black/60">
            <th className="py-2 pr-4 font-medium">Paciente</th>
            <th className="py-2 pr-4 font-medium">Dentista</th>
            <th className="py-2 pr-4 font-medium">Texto</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {prescriptionRows.map((prescription) => (
            <tr key={prescription.id} className="border-b border-black/5 align-top">
              <td className="py-2 pr-4">{prescription.patient.name}</td>
              <td className="py-2 pr-4">{prescription.dentist.name}</td>
              <td className="py-2 pr-4 max-w-xs whitespace-pre-wrap">{prescription.content}</td>
              <td className="py-2 pr-4">{STATUS_LABELS[prescription.status]}</td>
              <td className="py-2 pr-4">
                {prescription.status === "draft" && (
                  <form action={signPrescriptionAction}>
                    <input type="hidden" name="prescriptionId" value={prescription.id} />
                    <button type="submit" className="text-sm underline">
                      Assinar
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {prescriptionRows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-black/60">
                Nenhuma receita registrada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
