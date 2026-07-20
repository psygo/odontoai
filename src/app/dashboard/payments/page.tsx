import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { patients, payments } from "@/db/schema";
import { markPaymentPaidAction } from "./actions";
import { NewPaymentForm } from "./new-payment-form";

const METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PaymentsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [paymentRows, patientRows] = await Promise.all([
    db.query.payments.findMany({
      where: eq(payments.clinicId, clinicId),
      with: { patient: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    }),
    db.query.patients.findMany({
      where: eq(patients.clinicId, clinicId),
      orderBy: (p, { asc }) => [asc(p.name)],
      columns: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pagamentos</h1>

      <NewPaymentForm patients={patientRows} />

      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-black/10 text-black/60">
            <th className="py-2 pr-4 font-medium">Paciente</th>
            <th className="py-2 pr-4 font-medium">Valor</th>
            <th className="py-2 pr-4 font-medium">Método</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {paymentRows.map((payment) => (
            <tr key={payment.id} className="border-b border-black/5">
              <td className="py-2 pr-4">{payment.patient.name}</td>
              <td className="py-2 pr-4">{formatCents(payment.amountCents)}</td>
              <td className="py-2 pr-4">{METHOD_LABELS[payment.method]}</td>
              <td className="py-2 pr-4">{STATUS_LABELS[payment.status]}</td>
              <td className="py-2 pr-4">
                {payment.status === "pending" && (
                  <form action={markPaymentPaidAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <button type="submit" className="text-sm underline">
                      Marcar como pago
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {paymentRows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-black/60">
                Nenhum pagamento registrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
