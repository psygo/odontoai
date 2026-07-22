"use client";

import { useState } from "react";
import { useSearchTerm } from "../_components/search-provider";
import { APPOINTMENT_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { AppointmentModal, type AppointmentModalState } from "../calendar/appointment-modal";

export interface AppointmentRow {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  dentistId: string;
  dentistName: string;
  service: string | null;
  status: string;
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
  notes: string | null;
  hasPayment: boolean;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "scheduled", label: "Pendentes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "Faltas" },
];

export function AppointmentsPageClient({
  appointments,
  patients,
  dentists,
  todayStr,
}: {
  appointments: AppointmentRow[];
  patients: { id: string; name: string }[];
  dentists: { id: string; name: string }[];
  todayStr: string;
}) {
  const { searchTerm } = useSearchTerm();
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<AppointmentModalState>(null);

  const search = searchTerm.trim().toLowerCase();
  const filtered = appointments.filter(
    (a) => (statusFilter === "all" || a.status === statusFilter) && (!search || a.patientName.toLowerCase().includes(search)),
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
                statusFilter === tab.value
                  ? { background: "#2563EB", color: "#fff" }
                  : { background: "#F1F5F9", color: "#475569" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "create", dateStr: todayStr })}
          className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-bold text-white"
        >
          + Nova Consulta
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_0.9fr] border-b border-border bg-app-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <div>Paciente</div>
          <div>Data</div>
          <div>Horário</div>
          <div>Dentista</div>
          <div>Serviço</div>
          <div>Status</div>
        </div>
        {filtered.map((appt) => (
          <button
            key={appt.id}
            type="button"
            onClick={() =>
              setModal({
                mode: "detail",
                appointment: {
                  id: appt.id,
                  patientId: appt.patientId,
                  patientName: appt.patientName,
                  patientPhone: appt.patientPhone,
                  dentistId: appt.dentistId,
                  dentistName: appt.dentistName,
                  service: appt.service,
                  status: appt.status,
                  dateStr: appt.dateStr,
                  timeStr: appt.timeStr,
                  durationMinutes: appt.durationMinutes,
                  notes: appt.notes,
                  hasPayment: appt.hasPayment,
                },
              })
            }
            className="grid w-full grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_0.9fr] items-center border-b border-border/60 px-4 py-3 text-left text-sm hover:bg-app-bg"
          >
            <div className="truncate font-semibold text-ink">{appt.patientName}</div>
            <div className="text-ink-faint">{appt.dateStr}</div>
            <div className="text-ink-faint">{appt.timeStr}</div>
            <div className="truncate text-ink-soft">{appt.dentistName}</div>
            <div className="truncate text-ink-soft">{appt.service ?? "—"}</div>
            <div>
              <StatusBadge {...APPOINTMENT_STATUS_STYLE[appt.status]} />
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">Nenhuma consulta encontrada.</div>
        )}
      </div>

      <AppointmentModal state={modal} onClose={() => setModal(null)} patients={patients} dentists={dentists} todayStr={todayStr} />
    </div>
  );
}
