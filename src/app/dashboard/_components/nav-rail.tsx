"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BillingIcon, ChatIcon, HomeIcon, PatientsIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", Icon: HomeIcon, match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/customers", label: "Clientes", Icon: PatientsIcon, match: (p: string) => p.startsWith("/dashboard/customers") },
  { href: "/dashboard/payments", label: "Faturas", Icon: BillingIcon, match: (p: string) => p.startsWith("/dashboard/payments") },
  {
    href: "/dashboard/conversations",
    label: "Conversas",
    Icon: ChatIcon,
    match: (p: string) => p.startsWith("/dashboard/conversations"),
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
