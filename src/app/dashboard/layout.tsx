import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard/calendar", label: "Agenda" },
  { href: "/dashboard/patients", label: "Pacientes" },
  { href: "/dashboard/payments", label: "Pagamentos" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-black/10 dark:border-white/10 p-4">
        <div className="font-semibold mb-6">OdontoAI</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
