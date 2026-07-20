"use client";

import { useActionState } from "react";
import { updatePatientAction } from "./actions";

interface PatientData {
  id: string;
  name: string;
  phone: string;
  cpf: string | null;
  birthDate: string | null;
  email: string | null;
  notes: string | null;
}

export function EditPatientForm({ patient }: { patient: PatientData }) {
  const [errorMessage, formAction, isPending] = useActionState(updatePatientAction, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap gap-3 items-end border border-black/10 rounded p-4"
    >
      <input type="hidden" name="patientId" value={patient.id} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={patient.name}
          required
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm">
          Telefone (WhatsApp)
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          defaultValue={patient.phone}
          required
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cpf" className="text-sm">
          CPF
        </label>
        <input
          id="cpf"
          name="cpf"
          type="text"
          defaultValue={patient.cpf ?? ""}
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="birthDate" className="text-sm">
          Nascimento
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={patient.birthDate ?? ""}
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={patient.email ?? ""}
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
          defaultValue={patient.notes ?? ""}
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>

      {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}
    </form>
  );
}
