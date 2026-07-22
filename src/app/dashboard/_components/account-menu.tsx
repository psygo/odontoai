"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "../actions";

export function AccountMenu({ name, email, initials }: { name: string; email: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative mt-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: "#14375A", color: "#CBD5E1" }}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute bottom-0 left-full z-50 ml-2 w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
          <div className="px-2 py-1.5">
            <div className="truncate text-sm font-medium text-ink">{name}</div>
            <div className="truncate text-xs text-ink-faint">{email}</div>
          </div>
          <div className="my-1 border-t border-border" />
          <Link
            href="/dashboard/dentists"
            className="block rounded px-2 py-1.5 text-sm hover:bg-app-bg"
            onClick={() => setOpen(false)}
          >
            Equipe
          </Link>
          <Link
            href="/dashboard/settings"
            className="block rounded px-2 py-1.5 text-sm hover:bg-app-bg"
            onClick={() => setOpen(false)}
          >
            Configurações
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-app-bg">
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
