"use client";

import { useEffect, useRef, useState } from "react";
import { switchBusinessAction } from "../actions";
import { ChevronDownIcon } from "./icons";

export interface BusinessOption {
  id: string;
  name: string;
}

export function BusinessSwitcher({
  businesses,
  activeClinicId,
  fallbackName,
}: {
  businesses: BusinessOption[];
  activeClinicId: string;
  fallbackName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  const active = businesses.find((b) => b.id === activeClinicId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[17px] font-extrabold text-ink-strong"
      >
        {active?.name ?? fallbackName}
        <ChevronDownIcon className="h-4 w-4 text-ink-faint" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-background p-1.5 shadow-lg">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted">Seus negócios</div>
          {businesses.map((b) => (
            <form key={b.id} action={switchBusinessAction} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="clinicId" value={b.id} />
              <button
                type="submit"
                disabled={b.id === activeClinicId}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-app-bg disabled:cursor-default"
              >
                <span className="truncate">{b.name}</span>
                {b.id === activeClinicId && <span className="shrink-0 text-xs font-bold text-accent-teal">Ativo</span>}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
