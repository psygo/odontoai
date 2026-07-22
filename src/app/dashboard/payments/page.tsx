import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { paymentReceipts, patients, payments } from "@/db/schema";
import { linkReceiptToPaymentAction, markPaymentPaidAction } from "./actions";
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

  const [paymentRows, patientRows, receiptRows] = await Promise.all([
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
    db.query.paymentReceipts.findMany({
      where: eq(paymentReceipts.clinicId, clinicId),
      with: { patient: true, payment: true },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
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

      <div>
        <h2 className="text-sm font-semibold mb-2">Comprovantes recebidos</h2>
        <p className="text-sm text-black/60 mb-3 max-w-2xl">
          Enviados pelos pacientes no WhatsApp após pedirem a chave Pix. Um comprovante nunca
          marca um pagamento como pago sozinho — confirme aqui, e depois use &quot;Marcar como
          pago&quot; na tabela acima.
        </p>
        <div className="flex flex-col gap-4">
          {receiptRows.map((receipt) => {
            const pendingForPatient = paymentRows.filter(
              (payment) => payment.patient.id === receipt.patientId && payment.status === "pending",
            );
            return (
              <div key={receipt.id} className="flex gap-4 border border-black/10 rounded p-4 items-start">
                {receipt.mimeType.startsWith("image/") ? (
                  <img
                    src={`data:${receipt.mimeType};base64,${receipt.imageData.toString("base64")}`}
                    alt="Comprovante"
                    className="w-32 h-32 object-cover rounded border border-black/10"
                  />
                ) : (
                  <a
                    href={`data:${receipt.mimeType};base64,${receipt.imageData.toString("base64")}`}
                    download
                    className="w-32 h-32 flex items-center justify-center text-sm underline border border-black/10 rounded"
                  >
                    Abrir arquivo
                  </a>
                )}

                <div className="flex flex-col gap-1 text-sm">
                  <div>
                    <span className="font-medium">{receipt.patient.name}</span>{" "}
                    <span className="text-black/60">
                      · {new Date(receipt.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  {receipt.payment ? (
                    <div className="text-black/60">
                      Vinculado a {formatCents(receipt.payment.amountCents)} ({STATUS_LABELS[receipt.payment.status]})
                    </div>
                  ) : pendingForPatient.length > 0 ? (
                    <form action={linkReceiptToPaymentAction} className="flex items-center gap-2">
                      <input type="hidden" name="receiptId" value={receipt.id} />
                      <select name="paymentId" required className="rounded border border-black/15 px-2 py-1 text-sm">
                        <option value="">Vincular a...</option>
                        {pendingForPatient.map((payment) => (
                          <option key={payment.id} value={payment.id}>
                            {formatCents(payment.amountCents)} — {payment.description ?? "sem descrição"}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="text-sm underline">
                        Vincular
                      </button>
                    </form>
                  ) : (
                    <div className="text-black/60">
                      Nenhum pagamento pendente deste paciente para vincular.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {receiptRows.length === 0 && (
            <p className="text-sm text-black/60">Nenhum comprovante recebido ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
