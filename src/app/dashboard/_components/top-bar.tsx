"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchTerm } from "./search-provider";

const TITLES: { match: (p: string) => boolean; label: string }[] = [
  { match: (p) => p === "/dashboard", label: "Início" },
  { match: (p) => p.startsWith("/dashboard/calendar"), label: "Agenda" },
  { match: (p) => p.startsWith("/dashboard/appointments"), label: "Consultas" },
  { match: (p) => p.startsWith("/dashboard/payments"), label: "Faturamento" },
  { match: (p) => p.startsWith("/dashboard/patients"), label: "Pacientes" },
  { match: (p) => p.startsWith("/dashboard/prescriptions"), label: "Receitas" },
  { match: (p) => p.startsWith("/dashboard/dentists"), label: "Equipe" },
  { match: (p) => p.startsWith("/dashboard/settings"), label: "Configurações" },
];

// Matches the mock: the top-bar search only filters the Appointments and
// Billing lists, not the Patients directory (which has no search bar there).
const SEARCHABLE_PREFIXES = ["/dashboard/appointments", "/dashboard/payments"];

export function TopBar({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();
  const { searchTerm, setSearchTerm } = useSearchTerm();

  const title = TITLES.find((t) => t.match(pathname))?.label ?? "";
  const showSearch = SEARCHABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      <div className="text-[17px] font-extrabold text-ink-strong">{clinicName}</div>
      <div className="h-6.5 w-px bg-border" />
      <div className="text-[15px] font-semibold text-ink-soft">{title}</div>
      <div className="flex-1" />
      {showSearch && (
        <input
          type="text"
          placeholder="Buscar pacientes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-56 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none"
        />
      )}
      <Link
        href="/dashboard/calendar?new=1"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-blue-hover"
      >
        <span className="text-base leading-none">+</span> Nova Consulta
      </Link>
    </div>
  );
}
