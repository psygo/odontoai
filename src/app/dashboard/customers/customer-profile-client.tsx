"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCents, initials } from "../_components/format";
import { PAYMENT_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { PaymentModal, type PaymentModalState } from "../payments/payment-modal";
import { type CustomerDetail, CustomerModal, type CustomerModalState } from "./customer-modal";

export interface ProfilePayment {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  description: string | null;
  dueDate: string | null;
}

export function CustomerProfileClient({
  customer,
  payments,
}: {
  customer: CustomerDetail & { sinceLabel: string };
  payments: ProfilePayment[];
}) {
  const [editModal, setEditModal] = useState<CustomerModalState>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-[10px] border border-border bg-background p-5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-lg font-extrabold text-accent-blue">
          {initials(customer.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold text-ink-strong">{customer.name}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {customer.phone} · Cliente desde {customer.sinceLabel}
          </div>
        </div>
        <Link
          href={`/dashboard/conversations?customerId=${customer.id}`}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft"
        >
          Conversas
        </Link>
        <button
          type="button"
          onClick={() => setEditModal({ mode: "edit", customer })}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => setPaymentModal({ mode: "create", customerId: customer.id })}
          className="shrink-0 rounded-lg bg-accent-blue px-3 py-2 text-sm font-bold text-white"
        >
          + Novo Pagamento
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="border-b border-border bg-app-bg px-4 py-2.5 text-xs font-bold text-ink-strong">Faturamento</div>
        {payments.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              setPaymentModal({
                mode: "edit",
                payment: {
                  id: p.id,
                  customerId: customer.id,
                  customerName: customer.name,
                  amountCents: p.amountCents,
                  method: p.method,
                  status: p.status,
                  description: p.description,
                  dueDate: p.dueDate,
                },
              })
            }
            className="block w-full border-b border-border/60 px-4 py-2.5 text-left hover:bg-app-bg"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{formatCents(p.amountCents)}</span>
              <StatusBadge {...PAYMENT_STATUS_STYLE[p.status]} />
            </div>
            <div className="mt-0.5 truncate text-xs text-ink-faint">{p.description ?? "sem descrição"}</div>
          </button>
        ))}
        {payments.length === 0 && <div className="px-4 py-6 text-center text-sm text-ink-muted">Nenhum pagamento ainda.</div>}
      </div>

      <CustomerModal state={editModal} onClose={() => setEditModal(null)} />
      <PaymentModal
        state={paymentModal}
        onClose={() => setPaymentModal(null)}
        customers={[{ id: customer.id, name: customer.name }]}
      />
    </div>
  );
}
