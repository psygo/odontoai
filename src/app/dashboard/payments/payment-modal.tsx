"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { formatCents } from "../_components/format";
import { savePaymentAction } from "./actions";

export interface PaymentDetail {
  id: string;
  customerId: string;
  customerName: string;
  amountCents: number;
  method: string;
  status: string;
  description: string | null;
  dueDate: string | null;
}

export type PaymentModalState =
  | { mode: "create"; customerId?: string; description?: string; amountCents?: number }
  | { mode: "edit"; payment: PaymentDetail }
  | null;

const METHOD_OPTIONS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Atrasado" },
  { value: "cancelled", label: "Cancelado" },
];

const inputClass = "rounded-lg border border-border px-3 py-2 text-sm";

export function PaymentModal({
  state,
  onClose,
  customers,
}: {
  state: PaymentModalState;
  onClose: () => void;
  customers: { id: string; name: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [errorMessage, formAction, isPending] = useActionState(savePaymentAction, undefined);
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

  const editing = state.mode === "edit" ? state.payment : undefined;
  const createDefaults = state.mode === "create" ? state : undefined;
  const defaultAmount = editing?.amountCents ?? createDefaults?.amountCents;

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
          <div className="text-lg font-extrabold text-ink-strong">{editing ? "Editar cobrança" : "Nova cobrança"}</div>

          <input type="hidden" name="paymentId" value={editing?.id ?? ""} />

          {editing ? (
            <>
              <input type="hidden" name="customerId" value={editing.customerId} />
              <div>
                <label className="text-xs font-bold uppercase text-ink-faint">Cliente</label>
                <div className="mt-1 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm">{editing.customerName}</div>
              </div>
            </>
          ) : (
            <select name="customerId" required defaultValue={state.mode === "create" ? state.customerId ?? "" : ""} className={inputClass}>
              <option value="">Selecione o cliente...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2">
            <input
              name="amount"
              type="text"
              inputMode="decimal"
              required
              placeholder="150,00"
              defaultValue={defaultAmount ? (defaultAmount / 100).toFixed(2).replace(".", ",") : ""}
              className={`w-32 ${inputClass}`}
            />
            <select name="method" required defaultValue={editing?.method ?? "pix"} className={`flex-1 ${inputClass}`}>
              {METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <input type="date" name="dueDate" defaultValue={editing?.dueDate ?? ""} className={inputClass} />

          <input
            name="description"
            type="text"
            placeholder="Descrição"
            defaultValue={editing?.description ?? (state.mode === "create" ? state.description ?? "" : "")}
            className={inputClass}
          />

          {editing && (
            <select name="status" defaultValue={editing.status} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          {editing && (
            <div className="text-xs text-ink-muted">Valor atual: {formatCents(editing.amountCents)}</div>
          )}

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="mt-1 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink-soft">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-accent-teal px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
