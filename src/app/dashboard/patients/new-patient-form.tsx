"use client";

import { useActionState, useRef } from "react";
import { createPatientAction } from "./actions";

export function NewPatientForm() {
  const [errorMessage, formAction, isPending] = useActionState(createPatientAction, undefined);
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
        <label htmlFor="phone" className="text-sm">
          Telefone (WhatsApp)
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          placeholder="+5511999999999"
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
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Adicionando..." : "Adicionar paciente"}
      </button>

      {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}
    </form>
  );
}
