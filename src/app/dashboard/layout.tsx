import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "./actions";

const NAV_ITEMS = [
  { href: "/dashboard/calendar", label: "Agenda" },
  { href: "/dashboard/patients", label: "Pacientes" },
  { href: "/dashboard/prescriptions", label: "Receitas" },
  { href: "/dashboard/payments", label: "Pagamentos" },
  { href: "/dashboard/dentists", label: "Equipe" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4 flex flex-col">
        <div className="font-semibold mb-6">OdontoAI</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm hover:bg-black/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-black/10">
          <div className="text-sm font-medium">{session?.user?.name}</div>
          <div className="text-xs text-black/60 mb-3">{session?.user?.email}</div>
          <form action={signOutAction}>
            <button type="submit" className="text-sm underline">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
