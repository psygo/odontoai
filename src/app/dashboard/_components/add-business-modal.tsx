"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBusinessAction, switchBusinessAction } from "../actions";
import type { BusinessOption } from "./business-switcher";

const inputClass = "rounded-lg border border-border px-3 py-2 text-sm";

export function AddBusinessModal({
  open,
  onClose,
  businesses,
  activeClinicId,
}: {
  open: boolean;
  onClose: () => void;
  businesses: BusinessOption[];
  activeClinicId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitCount, setSubmitCount] = useState(0);
  const [errorMessage, formAction, isPending] = useActionState(createBusinessAction, undefined);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
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
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="w-[400px] max-w-[92vw] m-auto rounded-2xl border-0 p-0 backdrop:bg-black/45"
    >
      <div className="max-h-[88vh] overflow-auto p-5.5" onClick={(e) => e.stopPropagation()}>
        {businesses.length > 0 && (
          <div className="mb-4 flex flex-col gap-1 border-b border-border pb-4">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">Seus negócios</div>
            {businesses.map((b) => (
              <form key={b.id} action={switchBusinessAction} onSubmit={() => onClose()}>
                <input type="hidden" name="clinicId" value={b.id} />
                <button
                  type="submit"
                  disabled={b.id === activeClinicId}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-app-bg disabled:cursor-default"
                >
                  <span className="truncate">{b.name}</span>
                  {b.id === activeClinicId && <span className="shrink-0 text-xs font-bold text-accent-teal">Ativo</span>}
                </button>
              </form>
            ))}
          </div>
        )}

        <form action={formAction} onSubmit={() => setSubmitCount((c) => c + 1)} className="flex flex-col gap-3">
          <div className="text-lg font-extrabold text-ink-strong">Novo negócio</div>
          <p className="text-sm text-ink-faint">
            Cria um negócio novo e independente — você vira administrador dele e continua com acesso aos outros.
          </p>

          <input name="name" type="text" placeholder="Nome do negócio" required className={inputClass} />

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
              {isPending ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
