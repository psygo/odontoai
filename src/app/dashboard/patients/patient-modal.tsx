"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { savePatientAction } from "./actions";

export interface PatientDetail {
  id: string;
  name: string;
  phone: string;
  cpf: string | null;
  birthDate: string | null;
  email: string | null;
  notes: string | null;
}

export type PatientModalState = { mode: "create" } | { mode: "edit"; patient: PatientDetail } | null;

const inputClass = "rounded-lg border border-border px-3 py-2 text-sm";

export function PatientModal({ state, onClose }: { state: PatientModalState; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [errorMessage, formAction, isPending] = useActionState(savePatientAction, undefined);
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

  const editing = state.mode === "edit" ? state.patient : undefined;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="w-[440px] max-w-[92vw] m-auto rounded-2xl border-0 p-0 backdrop:bg-black/45"
    >
      <div className="max-h-[88vh] overflow-auto p-5.5" onClick={(e) => e.stopPropagation()}>
        <form key={JSON.stringify(state)} action={formAction} onSubmit={() => setSubmitCount((c) => c + 1)} className="flex flex-col gap-3">
          <div className="text-lg font-extrabold text-ink-strong">{editing ? "Editar paciente" : "Novo paciente"}</div>

          <input type="hidden" name="patientId" value={editing?.id ?? ""} />

          <input name="name" type="text" placeholder="Nome completo" required defaultValue={editing?.name ?? ""} className={inputClass} />
          <input
            name="phone"
            type="text"
            placeholder="Telefone (WhatsApp) — +5511999999999"
            required
            defaultValue={editing?.phone ?? ""}
            className={inputClass}
          />
          <div className="flex gap-2">
            <input name="cpf" type="text" placeholder="CPF" defaultValue={editing?.cpf ?? ""} className={`flex-1 ${inputClass}`} />
            <input name="birthDate" type="date" defaultValue={editing?.birthDate ?? ""} className={`flex-1 ${inputClass}`} />
          </div>
          <input name="email" type="email" placeholder="E-mail" defaultValue={editing?.email ?? ""} className={inputClass} />
          {editing && <textarea name="notes" rows={2} placeholder="Observações" defaultValue={editing.notes ?? ""} className={inputClass} />}

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
      </div>
    </dialog>
  );
}
