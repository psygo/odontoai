"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PRESCRIPTION_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { signPrescriptionAction } from "./actions";
import { PrescriptionModal, type PrescriptionModalState } from "./prescription-modal";

export interface PrescriptionRow {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  content: string;
  status: string;
}

const STATUS_TABS = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Rascunhos" },
  { value: "signed", label: "Assinadas" },
];

export function PrescriptionsPageClient({
  prescriptions,
  patients,
  dentists,
}: {
  prescriptions: PrescriptionRow[];
  patients: { id: string; name: string }[];
  dentists: { id: string; name: string }[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<PrescriptionModalState>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const newFlag = searchParams.get("new");
  // Initialized to null (not newFlag) so a "?new=1" present on the very
  // first render still counts as a change and opens the modal on load.
  const [prevNewFlag, setPrevNewFlag] = useState<string | null>(null);

  if (newFlag !== prevNewFlag) {
    setPrevNewFlag(newFlag);
    if (newFlag === "1") setModal({ mode: "create" });
  }

  useEffect(() => {
    if (newFlag === "1") router.replace("/dashboard/prescriptions");
  }, [newFlag, router]);

  const filtered = prescriptions.filter((rx) => statusFilter === "all" || rx.status === statusFilter);

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
                statusFilter === tab.value ? { background: "#7C3AED", color: "#fff" } : { background: "#F1F5F9", color: "#475569" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="rounded-lg bg-accent-purple px-4 py-2 text-sm font-bold text-white"
        >
          + Nova Receita
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="grid grid-cols-[1.2fr_1fr_1.6fr_1fr_0.8fr] border-b border-border bg-app-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <div>Paciente</div>
          <div>Dentista</div>
          <div>Texto</div>
          <div>Status</div>
          <div></div>
        </div>
        {filtered.map((rx) => (
          <div key={rx.id} className="grid grid-cols-[1.2fr_1fr_1.6fr_1fr_0.8fr] items-center border-b border-border/60 px-4 py-3 text-sm">
            <button
              type="button"
              onClick={() => setModal({ mode: "edit", prescription: rx })}
              className="truncate text-left font-semibold text-ink hover:underline"
            >
              {rx.patientName}
            </button>
            <div className="truncate text-ink-soft">{rx.dentistName}</div>
            <div className="truncate text-ink-faint">{rx.content}</div>
            <div>
              <StatusBadge {...PRESCRIPTION_STATUS_STYLE[rx.status]} />
            </div>
            <div>
              {rx.status === "draft" && (
                <form action={signPrescriptionAction}>
                  <input type="hidden" name="prescriptionId" value={rx.id} />
                  <button type="submit" className="text-xs font-semibold text-accent-purple underline">
                    Assinar
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink-muted">Nenhuma receita encontrada.</div>}
      </div>

      <PrescriptionModal state={modal} onClose={() => setModal(null)} patients={patients} dentists={dentists} />
    </div>
  );
}
