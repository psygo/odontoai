"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchTerm } from "../_components/search-provider";
import { formatCents } from "../_components/format";
import { PAYMENT_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { markPaymentPaidAction } from "./actions";
import { PaymentModal, type PaymentModalState } from "./payment-modal";

export interface PaymentRow {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string | null;
  amountCents: number;
  method: string;
  status: string;
  description: string | null;
  dueDate: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  other: "Outro",
};

const STATUS_TABS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "paid", label: "Pagas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "cancelled", label: "Canceladas" },
];

export interface OpenIntent {
  key: string;
  state: PaymentModalState;
}

export function PaymentsPageClient({
  payments,
  patients,
  openIntent,
}: {
  payments: PaymentRow[];
  patients: { id: string; name: string }[];
  openIntent: OpenIntent | null;
}) {
  const { searchTerm } = useSearchTerm();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<PaymentModalState>(null);
  const [prevIntentKey, setPrevIntentKey] = useState<string | null>(null);

  if (openIntent && openIntent.key !== prevIntentKey) {
    setPrevIntentKey(openIntent.key);
    setModal(openIntent.state);
  }

  useEffect(() => {
    if (openIntent) router.replace("/dashboard/payments");
  }, [openIntent, router]);

  const search = searchTerm.trim().toLowerCase();
  const filtered = payments.filter(
    (p) => (statusFilter === "all" || p.status === statusFilter) && (!search || p.patientName.toLowerCase().includes(search)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className="rounded-lg px-3.5 py-1.5 text-xs font-bold"
              style={
                statusFilter === tab.value ? { background: "#0D9488", color: "#fff" } : { background: "#F1F5F9", color: "#475569" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-lg bg-accent-teal px-4 py-2 text-sm font-bold text-white"
        >
          + Nova Cobrança
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_0.8fr] border-b border-border bg-app-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <div>Paciente</div>
          <div>Valor</div>
          <div>Método</div>
          <div>Vencimento</div>
          <div>Status</div>
          <div></div>
        </div>
        {filtered.map((payment) => (
          <div
            key={payment.id}
            className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_0.8fr] items-center border-b border-border/60 px-4 py-3 text-sm"
          >
            <button
              type="button"
              onClick={() =>
                setModal({
                  mode: "edit",
                  payment: {
                    id: payment.id,
                    patientId: payment.patientId,
                    patientName: payment.patientName,
                    appointmentId: payment.appointmentId,
                    amountCents: payment.amountCents,
                    method: payment.method,
                    status: payment.status,
                    description: payment.description,
                    dueDate: payment.dueDate,
                  },
                })
              }
              className="truncate text-left font-semibold text-ink hover:underline"
            >
              {payment.patientName}
            </button>
            <div className="text-ink-soft">{formatCents(payment.amountCents)}</div>
            <div className="text-ink-soft">{METHOD_LABELS[payment.method]}</div>
            <div className="text-ink-faint">{payment.dueDate ?? "—"}</div>
            <div>
              <StatusBadge {...PAYMENT_STATUS_STYLE[payment.status]} />
            </div>
            <div>
              {payment.status === "pending" && (
                <form action={markPaymentPaidAction}>
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <button type="submit" className="text-xs font-semibold text-accent-teal underline">
                    Marcar pago
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink-muted">Nenhuma cobrança encontrada.</div>}
      </div>

      <PaymentModal state={modal} onClose={() => setModal(null)} patients={patients} />
    </div>
  );
}
