"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppointmentsIcon, BillingIcon, CalendarIcon, HomeIcon, PatientsIcon, RxIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", Icon: HomeIcon, match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/calendar", label: "Agenda", Icon: CalendarIcon, match: (p: string) => p.startsWith("/dashboard/calendar") },
  {
    href: "/dashboard/appointments",
    label: "Consultas",
    Icon: AppointmentsIcon,
    match: (p: string) => p.startsWith("/dashboard/appointments"),
  },
  { href: "/dashboard/payments", label: "Faturas", Icon: BillingIcon, match: (p: string) => p.startsWith("/dashboard/payments") },
  { href: "/dashboard/patients", label: "Pacientes", Icon: PatientsIcon, match: (p: string) => p.startsWith("/dashboard/patients") },
  {
    href: "/dashboard/prescriptions",
    label: "Receitas",
    Icon: RxIcon,
    match: (p: string) => p.startsWith("/dashboard/prescriptions"),
  },
];

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className="flex h-13 w-13 flex-col items-center justify-center gap-1 rounded-[10px] transition-colors"
            style={{ color: active ? "#fff" : "#93A5B8", background: active ? "rgba(20,184,166,0.18)" : "transparent" }}
          >
            <Icon />
            <span className="text-[10px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
