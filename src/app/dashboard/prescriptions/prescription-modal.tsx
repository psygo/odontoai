"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PRESCRIPTION_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { savePrescriptionAction } from "./actions";

export interface PrescriptionDetail {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  content: string;
  status: string;
}

export type PrescriptionModalState = { mode: "create" } | { mode: "edit"; prescription: PrescriptionDetail } | null;

const inputClass = "rounded-lg border border-border px-3 py-2 text-sm";

export function PrescriptionModal({
  state,
  onClose,
  patients,
  dentists,
}: {
  state: PrescriptionModalState;
  onClose: () => void;
  patients: { id: string; name: string }[];
  dentists: { id: string; name: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [errorMessage, formAction, isPending] = useActionState(savePrescriptionAction, undefined);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
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
    return <dialog ref={dialogRef} onClose={onClose} className="m-auto rounded-2xl border-0 p-0 backdrop:bg-black/45" />;
  }

  const editing = state.mode === "edit" ? state.prescription : undefined;
  const readOnly = editing?.status === "signed";

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
        {readOnly && editing ? (
          <>
            <div className="flex items-start justify-between">
              <div className="text-lg font-extrabold text-ink-strong">{editing.patientName}</div>
              <StatusBadge {...PRESCRIPTION_STATUS_STYLE[editing.status]} />
            </div>
            <div className="mt-1 text-xs text-ink-muted">Dentista: {editing.dentistName}</div>
            <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-app-bg p-3 text-sm text-ink-soft">
              {editing.content}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Receitas assinadas são imutáveis e não podem mais ser editadas.
            </p>
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft">
              Fechar
            </button>
          </>
        ) : (
          <form key={JSON.stringify(state)} action={formAction} onSubmit={() => setSubmitCount((c) => c + 1)} className="flex flex-col gap-3">
            <div className="text-lg font-extrabold text-ink-strong">{editing ? "Editar receita" : "Nova receita"}</div>

            <input type="hidden" name="prescriptionId" value={editing?.id ?? ""} />

            <select name="patientId" required defaultValue={editing?.patientId ?? ""} className={inputClass}>
              <option value="">Selecione o paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select name="dentistId" required defaultValue={editing?.dentistId ?? ""} className={inputClass}>
              <option value="">Selecione o dentista...</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <textarea
              name="content"
              rows={6}
              required
              placeholder="Medicamento, dosagem, posologia..."
              defaultValue={editing?.content ?? ""}
              className={`font-mono ${inputClass}`}
            />

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            <div className="mt-1 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-lg bg-accent-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {isPending ? "Salvando..." : "Salvar rascunho"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
