"use client";

import { useActionState, useRef } from "react";
import { createPaymentAction } from "./actions";

interface Option {
  id: string;
  name: string;
}

const METHOD_OPTIONS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

export function NewPaymentForm({ patients }: { patients: Option[] }) {
  const [errorMessage, formAction, isPending] = useActionState(createPaymentAction, undefined);
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
        <label htmlFor="amount" className="text-sm">
          Valor (R$)
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          placeholder="150,00"
          required
          className="rounded border border-black/15 px-3 py-2 text-sm w-28"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="method" className="text-sm">
          Método
        </label>
        <select
          id="method"
          name="method"
          required
          className="rounded border border-black/15 px-3 py-2 text-sm"
        >
          {METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dueDate" className="text-sm">
          Vencimento
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-40">
        <label htmlFor="description" className="text-sm">
          Descrição
        </label>
        <input
          id="description"
          name="description"
          type="text"
          className="rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || patients.length === 0}
        className="rounded bg-foreground text-background px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Adicionando..." : "Adicionar cobrança"}
      </button>

      {errorMessage && <p className="text-sm text-red-600 w-full">{errorMessage}</p>}
      {patients.length === 0 && (
        <p className="text-sm text-black/60 w-full">Cadastre ao menos um paciente primeiro.</p>
      )}
    </form>
  );
}
