"use client";

import { useActionState, useRef } from "react";
import { createAppointmentAction } from "./actions";

interface Option {
  id: string;
  name: string;
}

export function NewAppointmentForm({ patients, dentists }: { patients: Option[]; dentists: Option[] }) {
  const [errorMessage, formAction, isPending] = useActionState(createAppointmentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-wrap gap-3 items-end border border-black/10 rounded p-4"
    >
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

      <div className="flex flex-col gap-1">
        <label htmlFor="startsAt" className="text-sm">
          Início
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="endsAt" className="text-sm">
          Fim
        </label>
        <input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          required
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-40">
        <label htmlFor="notes" className="text-sm">
          Observações
        </label>
        <input
          id="notes"
          name="notes"
          type="text"
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || patients.length === 0 || dentists.length === 0}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Agendando..." : "Agendar"}
      </button>

      {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}
      {(patients.length === 0 || dentists.length === 0) && (
        <p className="text-sm text-black/60 w-full">
          Cadastre ao menos um paciente e um dentista antes de agendar.
        </p>
      )}
    </form>
  );
}
