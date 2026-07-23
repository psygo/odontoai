import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { customers, paymentReceipts, payments } from "@/db/schema";
import { formatCents } from "../_components/format";
import { linkReceiptToPaymentAction } from "./actions";
import type { OpenIntent } from "./payments-page-client";
import { PaymentsPageClient, type PaymentRow } from "./payments-page-client";

interface PaymentsPageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const { new: newFlag } = await searchParams;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [paymentRows, customerRows, receiptRows] = await Promise.all([
    db.query.payments.findMany({
      where: eq(payments.clinicId, clinicId),
      with: { customer: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    }),
    db.query.customers.findMany({
      where: eq(customers.clinicId, clinicId),
      orderBy: (c, { asc }) => [asc(c.name)],
      columns: { id: true, name: true },
    }),
    db.query.paymentReceipts.findMany({
      where: eq(paymentReceipts.clinicId, clinicId),
      with: { customer: true, payment: true },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    }),
  ]);

  const openIntent: OpenIntent | null = newFlag === "1" ? { key: "new", state: { mode: "create" } } : null;

  const rows: PaymentRow[] = paymentRows.map((p) => ({
    id: p.id,
    customerId: p.customerId,
    customerName: p.customer.name,
    amountCents: p.amountCents,
    method: p.method,
    status: p.status,
    description: p.description,
    dueDate: p.dueDate,
  }));

  const totalBilled = rows.reduce((sum, p) => sum + p.amountCents, 0);
  const totalDue = rows.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <div className="rounded-[10px] border border-border bg-background px-4.5 py-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Total faturado</div>
          <div className="mt-1 text-xl font-extrabold text-ink-strong">{formatCents(totalBilled)}</div>
        </div>
        <div className="rounded-[10px] border border-border bg-background px-4.5 py-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Em aberto</div>
          <div className="mt-1 text-xl font-extrabold" style={{ color: "#D97706" }}>
            {formatCents(totalDue)}
          </div>
        </div>
      </div>

      <PaymentsPageClient payments={rows} customers={customerRows} openIntent={openIntent} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink-strong">Comprovantes recebidos</h2>
        <p className="max-w-2xl text-sm text-ink-faint">
          Enviados pelos clientes no WhatsApp após pedirem a chave Pix. Um comprovante nunca marca um pagamento como
          pago sozinho — confirme aqui, e depois use &quot;Marcar pago&quot; na tabela acima.
        </p>
        <div className="flex flex-col gap-4">
          {receiptRows.map((receipt) => {
            const pendingForCustomer = rows.filter((p) => p.customerId === receipt.customerId && p.status === "pending");
            return (
              <div key={receipt.id} className="flex items-start gap-4 rounded-[10px] border border-border bg-background p-4">
                {receipt.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic data: URI, next/image's optimizer doesn't apply
                  <img
                    src={`data:${receipt.mimeType};base64,${receipt.imageData.toString("base64")}`}
                    alt="Comprovante"
                    className="h-32 w-32 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <a
                    href={`data:${receipt.mimeType};base64,${receipt.imageData.toString("base64")}`}
                    download
                    className="flex h-32 w-32 items-center justify-center rounded-lg border border-border text-sm underline"
                  >
                    Abrir arquivo
                  </a>
                )}

                <div className="flex flex-col gap-1 text-sm">
                  <div>
                    <span className="font-semibold text-ink">{receipt.customer.name}</span>{" "}
                    <span className="text-ink-faint">· {new Date(receipt.createdAt).toLocaleString("pt-BR")}</span>
                  </div>

                  {receipt.payment ? (
                    <div className="text-ink-faint">Vinculado a {formatCents(receipt.payment.amountCents)}</div>
                  ) : pendingForCustomer.length > 0 ? (
                    <form action={linkReceiptToPaymentAction} className="flex items-center gap-2">
                      <input type="hidden" name="receiptId" value={receipt.id} />
                      <select name="paymentId" required className="rounded-lg border border-border px-2 py-1 text-sm">
                        <option value="">Vincular a...</option>
                        {pendingForCustomer.map((payment) => (
                          <option key={payment.id} value={payment.id}>
                            {formatCents(payment.amountCents)} — {payment.description ?? "sem descrição"}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="text-sm font-semibold text-accent-teal underline">
                        Vincular
                      </button>
                    </form>
                  ) : (
                    <div className="text-ink-faint">Nenhum pagamento pendente deste cliente para vincular.</div>
                  )}
                </div>
              </div>
            );
          })}
          {receiptRows.length === 0 && <p className="text-sm text-ink-muted">Nenhum comprovante recebido ainda.</p>}
        </div>
      </div>
    </div>
  );
}
