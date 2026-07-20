"use client";

import { useActionState, useRef } from "react";
import { createDentistAction } from "./actions";

export function NewDentistForm() {
  const [errorMessage, formAction, isPending] = useActionState(createDentistAction, undefined);
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
        <label htmlFor="name" className="text-sm">
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
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
          required
          className="rounded border border-black/15 px-3 py-2 text-sm"
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
          required
          className="rounded border border-black/15 px-3 py-2 text-sm w-24"
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
          required
          maxLength={2}
          className="rounded border border-black/15 px-3 py-2 text-sm w-16 uppercase"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Adicionando..." : "Adicionar dentista"}
      </button>

      {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}
    </form>
  );
}
