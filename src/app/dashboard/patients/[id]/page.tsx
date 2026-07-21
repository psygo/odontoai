import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { signPrescriptionAction } from "../../prescriptions/actions";
import { EditPatientForm } from "../edit-patient-form";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  other: "Outro",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const PRESCRIPTION_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  signed: "Assinada",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-4">{patient.name}</h1>
        <EditPatientForm patient={patient} />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Consultas</h2>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-black/10 text-black/60">
              <th className="py-2 pr-4 font-medium">Data</th>
              <th className="py-2 pr-4 font-medium">Dentista</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {patient.appointments.map((appointment) => (
              <tr key={appointment.id} className="border-b border-black/5">
                <td className="py-2 pr-4">{new Date(appointment.startsAt).toLocaleString("pt-BR")}</td>
                <td className="py-2 pr-4">{appointment.dentist.name}</td>
                <td className="py-2 pr-4">{APPOINTMENT_STATUS_LABELS[appointment.status]}</td>
              </tr>
            ))}
            {patient.appointments.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-black/60">
                  Nenhuma consulta registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Pagamentos</h2>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-black/10 text-black/60">
              <th className="py-2 pr-4 font-medium">Valor</th>
              <th className="py-2 pr-4 font-medium">Método</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {patient.payments.map((payment) => (
              <tr key={payment.id} className="border-b border-black/5">
                <td className="py-2 pr-4">{formatCents(payment.amountCents)}</td>
                <td className="py-2 pr-4">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                <td className="py-2 pr-4">{PAYMENT_STATUS_LABELS[payment.status]}</td>
              </tr>
            ))}
            {patient.payments.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-black/60">
                  Nenhum pagamento registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Receitas</h2>
          <Link href="/dashboard/prescriptions" className="text-sm underline">
            Nova receita
          </Link>
        </div>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-black/10 text-black/60">
              <th className="py-2 pr-4 font-medium">Dentista</th>
              <th className="py-2 pr-4 font-medium">Texto</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {patient.prescriptions.map((prescription) => (
              <tr key={prescription.id} className="border-b border-black/5 align-top">
                <td className="py-2 pr-4">{prescription.dentist.name}</td>
                <td className="py-2 pr-4 max-w-xs whitespace-pre-wrap">{prescription.content}</td>
                <td className="py-2 pr-4">{PRESCRIPTION_STATUS_LABELS[prescription.status]}</td>
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
            {patient.prescriptions.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-black/60">
                  Nenhuma receita registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
