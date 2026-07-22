import { and, eq, gte, inArray, lte } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointments, dentists, patients, payments } from "@/db/schema";
import { CalendarBoard, type CalendarBoardAppointment } from "./calendar-board";
import { clockLabel, dayRangeUtc, formatDateLongPtBr, isValidDateStr, minutesSinceGridStart, shiftDateStr, todayInClinicTZ } from "./grid-math";

interface CalendarPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { date: dateParam } = await searchParams;
  const date = isValidDateStr(dateParam) ? dateParam : todayInClinicTZ();
  const { start, end } = dayRangeUtc(date);

  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [appointmentRows, dentistRows, patientRows] = await Promise.all([
    db.query.appointments.findMany({
      where: and(eq(appointments.clinicId, clinicId), gte(appointments.startsAt, start), lte(appointments.startsAt, end)),
      with: { patient: true, dentist: true },
      orderBy: (a, { asc }) => [asc(a.startsAt)],
    }),
    db.query.dentists.findMany({
      where: eq(dentists.clinicId, clinicId),
      orderBy: (d, { asc }) => [asc(d.name)],
      columns: { id: true, name: true },
    }),
    db.query.patients.findMany({
      where: eq(patients.clinicId, clinicId),
      orderBy: (p, { asc }) => [asc(p.name)],
      columns: { id: true, name: true },
    }),
  ]);

  const appointmentIds = appointmentRows.map((a) => a.id);
  const paidAppointmentIds = new Set(
    appointmentIds.length
      ? (
          await db.query.payments.findMany({
            where: and(eq(payments.clinicId, clinicId), inArray(payments.appointmentId, appointmentIds)),
            columns: { appointmentId: true },
          })
        ).map((p) => p.appointmentId)
      : [],
  );

  const boardAppointments: CalendarBoardAppointment[] = appointmentRows.map((a) => ({
    id: a.id,
    dentistId: a.dentistId,
    dentistName: a.dentist.name,
    patientId: a.patientId,
    patientName: a.patient.name,
    patientPhone: a.patient.phone,
    service: a.service,
    status: a.status,
    notes: a.notes,
    startMinutes: minutesSinceGridStart(a.startsAt),
    durationMinutes: Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60_000),
    timeLabel: `${clockLabel(a.startsAt)}–${clockLabel(a.endsAt)}`,
    hasPayment: paidAppointmentIds.has(a.id),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[10px] border border-border bg-background px-4 py-3">
        <Link href={`/dashboard/calendar?date=${shiftDateStr(date, -1)}`} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-app-bg">
          ‹
        </Link>
        <Link href={`/dashboard/calendar?date=${shiftDateStr(date, 1)}`} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-app-bg">
          ›
        </Link>
        <Link
          href={`/dashboard/calendar?date=${todayInClinicTZ()}`}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-app-bg"
        >
          Hoje
        </Link>
        <div className="text-base font-bold text-ink-strong">{formatDateLongPtBr(date)}</div>
      </div>

      <CalendarBoard date={date} dentists={dentistRows} appointments={boardAppointments} patients={patientRows} />
    </div>
  );
}
