"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BusinessSwitcher, type BusinessOption } from "./business-switcher";
import { useSearchTerm } from "./search-provider";

const TITLES: { match: (p: string) => boolean; label: string }[] = [
  { match: (p) => p === "/dashboard", label: "Início" },
  { match: (p) => p.startsWith("/dashboard/payments"), label: "Faturamento" },
  { match: (p) => p.startsWith("/dashboard/customers"), label: "Clientes" },
  { match: (p) => p.startsWith("/dashboard/conversations"), label: "Conversas" },
  { match: (p) => p.startsWith("/dashboard/extensions"), label: "Extensões" },
  { match: (p) => p.startsWith("/dashboard/settings"), label: "Configurações" },
];

// Matches the mock: the top-bar search only filters the Billing list, not
// the Customers directory (which has no search bar there).
const SEARCHABLE_PREFIXES = ["/dashboard/payments"];

export function TopBar({
  businesses,
  activeClinicId,
  fallbackName,
}: {
  businesses: BusinessOption[];
  activeClinicId: string;
  fallbackName: string;
}) {
  const pathname = usePathname();
  const { searchTerm, setSearchTerm } = useSearchTerm();

  const title = TITLES.find((t) => t.match(pathname))?.label ?? "";
  const showSearch = SEARCHABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      <BusinessSwitcher businesses={businesses} activeClinicId={activeClinicId} fallbackName={fallbackName} />
      <div className="h-6.5 w-px bg-border" />
      <div className="text-[15px] font-semibold text-ink-soft">{title}</div>
      <div className="flex-1" />
      {showSearch && (
        <input
          type="text"
          placeholder="Buscar clientes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-56 rounded-lg border border-border bg-app-bg px-3 py-2 text-sm outline-none"
        />
      )}
      <Link
        href="/dashboard/customers?new=1"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-blue-hover"
      >
        <span className="text-base leading-none">+</span> Novo Cliente
      </Link>
    </div>
  );
}
