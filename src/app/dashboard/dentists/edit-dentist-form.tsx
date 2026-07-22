"use client";

import { useActionState } from "react";
import { updateDentistAction } from "./actions";

interface DentistData {
  id: string;
  name: string;
  email: string;
  croNumber: string;
  croState: string;
}

export function EditDentistForm({ dentist }: { dentist: DentistData }) {
  const [errorMessage, formAction, isPending] = useActionState(updateDentistAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap gap-3 items-end border border-border rounded p-4">
      <input type="hidden" name="dentistId" value={dentist.id} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={dentist.name}
          required
          className="rounded border border-border px-3 py-2 text-sm"
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
          defaultValue={dentist.email}
          required
          className="rounded border border-border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="croNumber" className="text-sm">
          CRO
        </label>
        <input
          id="croNumber"
          name="croNumber"
          type="text"
          defaultValue={dentist.croNumber}
          required
          className="rounded border border-border px-3 py-2 text-sm w-24"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="croState" className="text-sm">
          UF
        </label>
        <input
          id="croState"
          name="croState"
          type="text"
          defaultValue={dentist.croState}
          required
          maxLength={2}
          className="rounded border border-border px-3 py-2 text-sm w-16 uppercase"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent-blue text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>

      {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}
    </form>
  );
}
