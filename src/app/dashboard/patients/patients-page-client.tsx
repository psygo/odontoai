"use client";

import Link from "next/link";
import { useState } from "react";
import { initials } from "../_components/format";
import { PatientModal, type PatientModalState } from "./patient-modal";

export interface PatientRow {
  id: string;
  name: string;
  phone: string;
  visitCount: number;
  lastVisitLabel: string;
}

export function PatientsPageClient({ patients }: { patients: PatientRow[] }) {
  const [modal, setModal] = useState<PatientModalState>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-bold text-white"
        >
          + Novo Paciente
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr] border-b border-border bg-app-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <div>Paciente</div>
          <div>Telefone</div>
          <div>Visitas</div>
          <div>Última visita</div>
        </div>
        {patients.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/patients/${p.id}`}
            className="grid grid-cols-[1.4fr_1fr_0.7fr_1fr] items-center border-b border-border/60 px-4 py-3 text-sm hover:bg-app-bg"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-extrabold text-accent-blue">
                {initials(p.name)}
              </div>
              <span className="truncate font-semibold text-ink">{p.name}</span>
            </div>
            <div className="text-ink-faint">{p.phone}</div>
            <div className="text-ink-soft">{p.visitCount}</div>
            <div className="text-ink-faint">{p.lastVisitLabel}</div>
          </Link>
        ))}
        {patients.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">Nenhum paciente cadastrado ainda.</div>
        )}
      </div>

      <PatientModal state={modal} onClose={() => setModal(null)} />
    </div>
  );
}
