"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { SERVICE_OPTIONS } from "@/lib/services";
import { APPOINTMENT_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { deleteAppointmentAction, saveAppointmentAction, updateAppointmentStatusAction } from "./actions";

export interface AppointmentDetail {
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

export type AppointmentModalState =
  | { mode: "create"; dentistId?: string; dateStr?: string; timeStr?: string; patientId?: string }
  | { mode: "detail"; appointment: AppointmentDetail }
  | null;

interface AppointmentModalProps {
  state: AppointmentModalState;
  onClose: () => void;
  patients: { id: string; name: string }[];
  dentists: { id: string; name: string }[];
  todayStr: string;
}

const DURATION_OPTIONS = [30, 45, 60, 90];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "Faltou" },
];

function timeOptions(): string[] {
  const options: string[] = [];
  for (let m = 8 * 60; m < 18 * 60; m += 30) {
    options.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return options;
}

const inputClass = "rounded-lg border border-border px-3 py-2 text-sm";

export function AppointmentModal({ state, onClose, patients, dentists, todayStr }: AppointmentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formMode, setFormMode] = useState<"detail" | "form">(state?.mode === "create" ? "form" : "detail");
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [submitCount, setSubmitCount] = useState(0);
  const [errorMessage, formAction, isPending] = useActionState(saveAppointmentAction, undefined);
  const [prevState, setPrevState] = useState(state);

  // Adjusted during render (React's "adjusting state when a prop changes"
  // pattern) rather than in an effect, to avoid an extra post-commit render.
  if (state !== prevState) {
    setPrevState(state);
    setFormMode(state?.mode === "create" ? "form" : "detail");
    setPatientMode("existing");
    setSubmitCount(0);
  }

  useEffect(() => {
    if (submitCount > 0 && !isPending && !errorMessage) {
      onClose();
    }
  }, [isPending, errorMessage, submitCount, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (state) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [state]);

  if (!state) {
    return (
      <dialog ref={dialogRef} onClose={onClose} className="m-auto rounded-2xl border-0 p-0 backdrop:bg-black/45" />
    );
  }

  const appointment = state.mode === "detail" ? state.appointment : undefined;
  const canComplete = appointment && appointment.status !== "completed" && appointment.status !== "cancelled";
  const canCancel = appointment && appointment.status !== "cancelled" && appointment.status !== "completed";
  const canGenerateReceipt = appointment && appointment.status === "completed" && !appointment.hasPayment;
  const createDefaults = state.mode === "create" ? state : undefined;
  const durationChoices =
    appointment && !DURATION_OPTIONS.includes(appointment.durationMinutes)
      ? [...DURATION_OPTIONS, appointment.durationMinutes].sort((a, b) => a - b)
      : DURATION_OPTIONS;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="w-[460px] max-w-[92vw] m-auto rounded-2xl border-0 p-0 backdrop:bg-black/45"
    >
      <div className="max-h-[88vh] overflow-auto p-5.5" onClick={(e) => e.stopPropagation()}>
        {formMode === "detail" && appointment && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-extrabold text-ink-strong">{appointment.patientName}</div>
                <div className="mt-0.5 text-xs text-ink-muted">{appointment.patientPhone}</div>
              </div>
              <StatusBadge {...APPOINTMENT_STATUS_STYLE[appointment.status]} />
            </div>

            <div className="mt-4 flex flex-col gap-1.5 text-sm text-ink-soft">
              {appointment.service && (
                <div>
                  <b>Serviço:</b> {appointment.service}
                </div>
              )}
              <div>
                <b>Dentista:</b> {appointment.dentistName}
              </div>
              <div>
                <b>Quando:</b> {appointment.dateStr} · {appointment.timeStr}
              </div>
              {appointment.notes && (
                <div>
                  <b>Observações:</b> {appointment.notes}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {canComplete && (
                <form action={updateAppointmentStatusAction} onSubmit={onClose} className="flex-1 min-w-[140px]">
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="status" value="completed" />
                  <button type="submit" className="w-full rounded-lg bg-[#059669] px-3 py-2 text-xs font-bold text-white">
                    Marcar concluída
                  </button>
                </form>
              )}
              {canGenerateReceipt && (
                <Link
                  href={`/dashboard/payments?fromAppointment=${appointment.id}`}
                  onClick={onClose}
                  className="flex-1 min-w-[140px] rounded-lg bg-accent-teal px-3 py-2 text-center text-xs font-bold text-white"
                >
                  Gerar cobrança
                </Link>
              )}
              <button
                type="button"
                onClick={() => setFormMode("form")}
                className="flex-1 min-w-[100px] rounded-lg border border-border px-3 py-2 text-xs font-bold text-ink-soft"
              >
                Editar
              </button>
              {canCancel && (
                <form action={updateAppointmentStatusAction} onSubmit={onClose} className="flex-1 min-w-[100px]">
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600"
                  >
                    Cancelar
                  </button>
                </form>
              )}
              <form action={deleteAppointmentAction} onSubmit={onClose}>
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <button type="submit" className="rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600">
                  Excluir
                </button>
              </form>
            </div>
          </>
        )}

        {formMode === "form" && (
          <form
            key={JSON.stringify(state)}
            action={formAction}
            onSubmit={() => setSubmitCount((c) => c + 1)}
            className="flex flex-col gap-3"
          >
            <div className="text-lg font-extrabold text-ink-strong">
              {appointment ? "Editar consulta" : "Nova consulta"}
            </div>

            <input type="hidden" name="appointmentId" value={appointment?.id ?? ""} />

            {appointment ? (
              <>
                <input type="hidden" name="patientMode" value="existing" />
                <input type="hidden" name="patientId" value={appointment.patientId} />
                <div>
                  <label className="text-xs font-bold uppercase text-ink-faint">Paciente</label>
                  <div className="mt-1 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm">
                    {appointment.patientName}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPatientMode("existing")}
                    className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-bold"
                    style={
                      patientMode === "existing"
                        ? { borderColor: "#2563EB", background: "#EFF6FF", color: "#1D4ED8" }
                        : { borderColor: "var(--color-border)", color: "var(--color-ink-faint)" }
                    }
                  >
                    Paciente existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode("new")}
                    className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-bold"
                    style={
                      patientMode === "new"
                        ? { borderColor: "#2563EB", background: "#EFF6FF", color: "#1D4ED8" }
                        : { borderColor: "var(--color-border)", color: "var(--color-ink-faint)" }
                    }
                  >
                    Novo paciente
                  </button>
                </div>
                <input type="hidden" name="patientMode" value={patientMode} />
                {patientMode === "existing" ? (
                  <select name="patientId" required defaultValue={createDefaults?.patientId ?? ""} className={inputClass}>
                    <option value="">Selecione o paciente...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input name="newPatientName" placeholder="Nome completo" required className={`flex-1 ${inputClass}`} />
                    <input name="newPatientPhone" placeholder="Telefone" required className={`flex-1 ${inputClass}`} />
                  </div>
                )}
              </>
            )}

            <select name="dentistId" required defaultValue={appointment?.dentistId ?? createDefaults?.dentistId ?? ""} className={inputClass}>
              <option value="">Selecione o dentista...</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select name="service" defaultValue={appointment?.service ?? ""} className={inputClass}>
              <option value="">Selecione o serviço...</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="date"
                name="date"
                required
                defaultValue={appointment?.dateStr ?? createDefaults?.dateStr ?? todayStr}
                className={`flex-1 ${inputClass}`}
              />
              <select name="time" required defaultValue={appointment?.timeStr ?? createDefaults?.timeStr ?? "09:00"} className={`flex-1 ${inputClass}`}>
                {timeOptions().map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select name="duration" required defaultValue={String(appointment?.durationMinutes ?? 30)} className={`w-28 ${inputClass}`}>
                {durationChoices.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>

            {appointment && (
              <select name="status" defaultValue={appointment.status} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            <textarea name="notes" rows={2} defaultValue={appointment?.notes ?? ""} placeholder="Observações" className={inputClass} />

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            <div className="mt-1 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-accent-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
