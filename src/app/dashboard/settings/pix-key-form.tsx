"use client";

import { useActionState } from "react";
import { updatePixKeyAction } from "./actions";

export function PixKeyForm({ pixKey }: { pixKey: string | null }) {
  const [errorMessage, formAction, isPending] = useActionState(updatePixKeyAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 max-w-md">
      <label htmlFor="pixKey" className="text-sm">
        Chave Pix da clínica
      </label>
      <input
        id="pixKey"
        name="pixKey"
        type="text"
        defaultValue={pixKey ?? ""}
        placeholder="email, telefone, CNPJ ou chave aleatória"
        className="rounded border border-border px-3 py-2 text-sm font-mono"
      />
      <p className="text-sm text-ink-faint">
        Enviada exatamente como está aqui pela assistente de WhatsApp quando um paciente pergunta
        como pagar — a IA nunca digita a chave de memória.
      </p>
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-accent-blue text-white px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
    </form>
  );
}
