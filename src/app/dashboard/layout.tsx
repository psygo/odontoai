import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clinicMemberships } from "@/db/schema";
import { AccountMenu } from "./_components/account-menu";
import { initials } from "./_components/format";
import { NavRail } from "./_components/nav-rail";
import { SearchProvider } from "./_components/search-provider";
import { SidebarExtras } from "./_components/sidebar-extras";
import { TopBar } from "./_components/top-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const memberships = await db.query.clinicMemberships.findMany({
    where: eq(clinicMemberships.userId, session!.user.id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    with: { clinic: { columns: { id: true, name: true } } },
  });
  const businesses = memberships.map((m) => ({ id: m.clinic.id, name: m.clinic.name }));

  const name = session?.user?.name ?? "";

  return (
    <SearchProvider>
      <div className="flex min-h-screen">
        <aside className="flex w-19 shrink-0 flex-col items-center gap-7 bg-sidebar py-4.5">
          <div className="flex h-9.5 w-9.5 items-center justify-center rounded-[10px] bg-accent-teal text-sm font-extrabold text-white">
            BM
          </div>
          <NavRail />

          <div className="mt-auto flex flex-col items-center gap-2">
            <SidebarExtras businesses={businesses} activeClinicId={session!.user.clinicId} />
            <AccountMenu name={name} email={session?.user?.email ?? ""} initials={initials(name) || "?"} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar businesses={businesses} activeClinicId={session!.user.clinicId} fallbackName="Business Manager" />
          <main className="flex-1 overflow-auto bg-app-bg p-6">{children}</main>
        </div>
      </div>
    </SearchProvider>
  );
}
