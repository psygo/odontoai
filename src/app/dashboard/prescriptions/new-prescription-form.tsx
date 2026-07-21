"use client";

import { useActionState, useRef } from "react";
import { createPrescriptionAction } from "./actions";

interface Option {
  id: string;
  name: string;
}

export function NewPrescriptionForm({ patients, dentists }: { patients: Option[]; dentists: Option[] }) {
  const [errorMessage, formAction, isPending] = useActionState(createPrescriptionAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const canSubmit = patients.length > 0 && dentists.length > 0;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3 border border-black/10 rounded p-4"
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="patientId" className="text-sm">
            Paciente
          </label>
          <select
            id="patientId"
            name="patientId"
            required
            className="rounded border border-black/15 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dentistId" className="text-sm">
            Dentista
          </label>
          <select
            id="dentistId"
            name="dentistId"
            required
            className="rounded border border-black/15 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {dentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>
                {dentist.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm">
          Texto da receita
        </label>
        <textarea
          id="content"
          name="content"
          rows={5}
          required
          placeholder="Medicamento, dosagem, posologia..."
          className="rounded border border-black/15 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar rascunho"}
        </button>
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {!canSubmit && (
        <p className="text-sm text-black/60">Cadastre ao menos um paciente e um dentista primeiro.</p>
      )}
    </form>
  );
}
