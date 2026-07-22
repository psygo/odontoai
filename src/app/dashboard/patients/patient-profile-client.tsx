"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCents, initials } from "../_components/format";
import { APPOINTMENT_STATUS_STYLE, PAYMENT_STATUS_STYLE, PRESCRIPTION_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { PaymentModal, type PaymentModalState } from "../payments/payment-modal";
import { type PatientDetail, PatientModal, type PatientModalState } from "./patient-modal";

export interface ProfileAppointment {
  id: string;
  service: string | null;
  status: string;
  dateLabel: string;
  timeLabel: string;
  dentistName: string;
}

export interface ProfilePayment {
  id: string;
  appointmentId: string | null;
  amountCents: number;
  method: string;
  status: string;
  description: string | null;
  dueDate: string | null;
}

export interface ProfilePrescription {
  id: string;
  status: string;
  dateLabel: string;
  dentistName: string;
  excerpt: string;
}

export function PatientProfileClient({
  patient,
  appointments,
  payments,
  prescriptions,
}: {
  patient: PatientDetail & { sinceLabel: string };
  appointments: ProfileAppointment[];
  payments: ProfilePayment[];
  prescriptions: ProfilePrescription[];
}) {
  const [editModal, setEditModal] = useState<PatientModalState>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-[10px] border border-border bg-background p-5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-lg font-extrabold text-accent-blue">
          {initials(patient.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold text-ink-strong">{patient.name}</div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {patient.phone} · Paciente desde {patient.sinceLabel}
          </div>
        </div>
        <Link
          href={`/dashboard/conversations?patientId=${patient.id}`}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft"
        >
          Conversas
        </Link>
        <button
          type="button"
          onClick={() => setEditModal({ mode: "edit", patient })}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft"
        >
          Editar
        </button>
        <Link
          href={`/dashboard/calendar?new=1&patientId=${patient.id}`}
          className="shrink-0 rounded-lg bg-accent-blue px-3 py-2 text-sm font-bold text-white"
        >
          + Nova Consulta
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="overflow-hidden rounded-[10px] border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-app-bg px-4 py-2.5">
            <span className="text-xs font-bold text-ink-strong">Consultas</span>
            <Link href="/dashboard/appointments" className="text-xs font-semibold text-accent-blue">
              Ver todas
            </Link>
          </div>
          {appointments.map((a) => (
            <div key={a.id} className="border-b border-border/60 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-ink">{a.service ?? "Consulta"}</span>
                <StatusBadge {...APPOINTMENT_STATUS_STYLE[a.status]} />
              </div>
              <div className="mt-0.5 text-xs text-ink-faint">
                {a.dateLabel} · {a.timeLabel} · {a.dentistName}
              </div>
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-ink-muted">Nenhuma consulta ainda.</div>
          )}
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
                    patientId: patient.id,
                    patientName: patient.name,
                    appointmentId: p.appointmentId,
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

        <div className="overflow-hidden rounded-[10px] border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-app-bg px-4 py-2.5">
            <span className="text-xs font-bold text-ink-strong">Receitas</span>
            <Link href="/dashboard/prescriptions" className="text-xs font-semibold text-accent-purple">
              Gerenciar
            </Link>
          </div>
          {prescriptions.map((rx) => (
            <div key={rx.id} className="border-b border-border/60 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-ink">{rx.excerpt}</span>
                <StatusBadge {...PRESCRIPTION_STATUS_STYLE[rx.status]} />
              </div>
              <div className="mt-0.5 text-xs text-ink-faint">
                {rx.dateLabel} · {rx.dentistName}
              </div>
            </div>
          ))}
          {prescriptions.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-ink-muted">Nenhuma receita ainda.</div>
          )}
        </div>
      </div>

      <PatientModal state={editModal} onClose={() => setEditModal(null)} />
      <PaymentModal state={paymentModal} onClose={() => setPaymentModal(null)} patients={[]} />
    </div>
  );
}
