import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { NewPatientForm } from "./new-patient-form";

export default async function PatientsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const rows = await db.query.patients.findMany({
    where: eq(patients.clinicId, clinicId),
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pacientes</h1>

      <NewPatientForm />

      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-black/10 text-black/60">
            <th className="py-2 pr-4 font-medium">Nome</th>
            <th className="py-2 pr-4 font-medium">Telefone</th>
            <th className="py-2 pr-4 font-medium">E-mail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((patient) => (
            <tr key={patient.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                <Link href={`/dashboard/patients/${patient.id}`} className="underline">
                  {patient.name}
                </Link>
              </td>
              <td className="py-2 pr-4">{patient.phone}</td>
              <td className="py-2 pr-4">{patient.email ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-black/60">
                Nenhum paciente cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
