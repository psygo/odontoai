import { and, eq, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointments, dentists, payments, prescriptions } from "@/db/schema";
import { dayRangeUtc, todayInClinicTZ } from "./calendar/grid-math";
import { formatCents } from "./_components/format";
import { dentistColorMap } from "./_components/provider-colors";
import { APPOINTMENT_STATUS_STYLE, StatusBadge } from "./_components/status-badge";

export default async function DashboardHomePage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;
  const today = todayInClinicTZ();
  const { start, end } = dayRangeUtc(today);

  const [todayAppointments, scheduledAppointments, pendingPayments, signedPrescriptions, dentistRows, recentPayments] =
    await Promise.all([
      db.query.appointments.findMany({
        where: and(eq(appointments.clinicId, clinicId), gte(appointments.startsAt, start), lte(appointments.startsAt, end)),
        with: { patient: true, dentist: true },
        orderBy: (a, { asc }) => [asc(a.startsAt)],
      }),
      db.query.appointments.findMany({
        where: and(eq(appointments.clinicId, clinicId), eq(appointments.status, "scheduled")),
        columns: { id: true },
      }),
      db.query.payments.findMany({
        where: and(eq(payments.clinicId, clinicId), eq(payments.status, "pending")),
        columns: { amountCents: true },
      }),
      db.query.prescriptions.findMany({
        where: and(eq(prescriptions.clinicId, clinicId), eq(prescriptions.status, "signed")),
        columns: { id: true },
      }),
      db.query.dentists.findMany({
        where: eq(dentists.clinicId, clinicId),
        orderBy: (d, { asc }) => [asc(d.name)],
        columns: { id: true },
      }),
      db.query.payments.findMany({
        where: eq(payments.clinicId, clinicId),
        with: { patient: true },
        orderBy: (p, { desc }) => [desc(p.createdAt)],
        limit: 4,
      }),
    ]);

  const colorByDentist = dentistColorMap(dentistRows);
  const outstandingCents = pendingPayments.reduce((sum, p) => sum + p.amountCents, 0);

  const stats = [
    { label: "Consultas hoje", value: String(todayAppointments.length), color: "#0B2A45" },
    { label: "Pendentes de confirmação", value: String(scheduledAppointments.length), color: "#B45309" },
    { label: "Saldo em aberto", value: formatCents(outstandingCents), color: "#D97706" },
    { label: "Receitas assinadas", value: String(signedPrescriptions.length), color: "#6D28D9" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3.5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[10px] border border-border bg-background px-4.5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{stat.label}</div>
            <div className="mt-1.5 text-2xl font-extrabold" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="overflow-hidden rounded-[10px] border border-border bg-background">
          <div className="border-b border-border bg-app-bg px-4 py-3 text-xs font-bold text-ink-strong">
            Agenda de hoje
          </div>
          {todayAppointments.map((appointment) => {
            const style = APPOINTMENT_STATUS_STYLE[appointment.status];
            return (
              <Link
                key={appointment.id}
                href={`/dashboard/patients/${appointment.patientId}`}
                className="flex items-center gap-3 border-b border-border/60 px-4 py-3 hover:bg-app-bg"
              >
                <div className="w-1 self-stretch rounded" style={{ background: colorByDentist.get(appointment.dentistId) }} />
                <div className="w-19 shrink-0 text-xs text-ink-faint">
                  {appointment.startsAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {appointment.patient.name} {appointment.service ? `— ${appointment.service}` : ""}
                  </div>
                  <div className="text-xs text-ink-faint">{appointment.dentist.name}</div>
                </div>
                <StatusBadge {...style} />
              </Link>
            );
          })}
          {todayAppointments.length === 0 && (
            <div className="px-8 py-8 text-center text-sm text-ink-muted">Nenhuma consulta marcada para hoje.</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[10px] border border-border bg-background p-4">
            <div className="mb-3 text-xs font-bold text-ink-strong">Ações rápidas</div>
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard/calendar?new=1"
                className="rounded-lg bg-accent-blue px-3 py-2.5 text-left text-sm font-bold text-white"
              >
                + Nova Consulta
              </Link>
              <Link
                href="/dashboard/payments?new=1"
                className="rounded-lg bg-accent-teal px-3 py-2.5 text-left text-sm font-bold text-white"
              >
                + Novo Pagamento
              </Link>
              <Link
                href="/dashboard/prescriptions?new=1"
                className="rounded-lg bg-accent-purple px-3 py-2.5 text-left text-sm font-bold text-white"
              >
                + Nova Receita
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-border bg-background">
            <div className="border-b border-border bg-app-bg px-4 py-3 text-xs font-bold text-ink-strong">
              Pagamentos recentes
            </div>
            {recentPayments.map((payment) => (
              <div key={payment.id} className="border-b border-border/60 px-4 py-2.5">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-ink">{payment.patient.name}</span>
                  <span className="text-xs text-ink-soft">{formatCents(payment.amountCents)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {payment.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </div>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-muted">Nenhum pagamento ainda.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
