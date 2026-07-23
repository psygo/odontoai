"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initials } from "../_components/format";
import { CustomerModal, type CustomerModalState } from "./customer-modal";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  paymentCount: number;
  lastPaymentLabel: string;
}

export function CustomersPageClient({ customers, openCreate }: { customers: CustomerRow[]; openCreate: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState<CustomerModalState>(null);
  // Initialized to false (not `openCreate`) so a "?new=1" present on the very
  // first render still counts as a change and opens the modal on load.
  const [prevOpenCreate, setPrevOpenCreate] = useState(false);

  if (openCreate !== prevOpenCreate) {
    setPrevOpenCreate(openCreate);
    if (openCreate) setModal({ mode: "create" });
  }

  useEffect(() => {
    if (openCreate) router.replace("/dashboard/customers");
  }, [openCreate, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-bold text-white"
        >
          + Novo Cliente
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr] border-b border-border bg-app-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <div>Cliente</div>
          <div>Telefone</div>
          <div>Pagamentos</div>
          <div>Última cobrança</div>
        </div>
        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/customers/${c.id}`}
            className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr] items-center border-b border-border/60 px-4 py-3 text-sm hover:bg-app-bg"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-extrabold text-accent-blue">
                {initials(c.name)}
              </div>
              <span className="truncate font-semibold text-ink">{c.name}</span>
            </div>
            <div className="text-ink-faint">{c.phone}</div>
            <div className="text-ink-soft">{c.paymentCount}</div>
            <div className="text-ink-faint">{c.lastPaymentLabel}</div>
          </Link>
        ))}
        {customers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">Nenhum cliente cadastrado ainda.</div>
        )}
      </div>

      <CustomerModal state={modal} onClose={() => setModal(null)} />
    </div>
  );
}
