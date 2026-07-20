import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { appointments, dentists, patients } from "@/db/schema";
import { updateAppointmentStatusAction } from "./actions";
import { FullCalendarView } from "./full-calendar-view";
import { NewAppointmentForm } from "./new-appointment-form";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "scheduled", label: "Agendado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
  { value: "no_show", label: "Faltou" },
];

export default async function CalendarPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [appointmentRows, patientRows, dentistRows] = await Promise.all([
    db.query.appointments.findMany({
      where: eq(appointments.clinicId, clinicId),
      with: { patient: true, dentist: true },
      orderBy: (a, { asc }) => [asc(a.startsAt)],
    }),
    db.query.patients.findMany({
      where: eq(patients.clinicId, clinicId),
      orderBy: (p, { asc }) => [asc(p.name)],
      columns: { id: true, name: true },
    }),
    db.query.dentists.findMany({
      where: eq(dentists.clinicId, clinicId),
      orderBy: (d, { asc }) => [asc(d.name)],
      columns: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Agenda</h1>

      <NewAppointmentForm patients={patientRows} dentists={dentistRows} />

      <FullCalendarView
        events={appointmentRows.map((appointment) => ({
          id: appointment.id,
          title: `${appointment.patient.name} — ${appointment.dentist.name}`,
          start: appointment.startsAt.toISOString(),
          end: appointment.endsAt.toISOString(),
          status: appointment.status,
          patientId: appointment.patientId,
        }))}
      />

      <h2 className="text-sm font-semibold">Todas as consultas</h2>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-black/10 text-black/60">
            <th className="py-2 pr-4 font-medium">Horário</th>
            <th className="py-2 pr-4 font-medium">Paciente</th>
            <th className="py-2 pr-4 font-medium">Dentista</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointmentRows.map((appointment) => (
            <tr key={appointment.id} className="border-b border-black/5">
              <td className="py-2 pr-4 whitespace-nowrap">
                {new Date(appointment.startsAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </td>
              <td className="py-2 pr-4">{appointment.patient.name}</td>
              <td className="py-2 pr-4">{appointment.dentist.name}</td>
              <td className="py-2 pr-4">
                <form action={updateAppointmentStatusAction} className="flex gap-2 items-center">
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <select
                    name="status"
                    defaultValue={appointment.status}
                    className="rounded border border-black/15 px-2 py-1 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="text-sm underline">
                    Salvar
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {appointmentRows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-black/60">
                Nenhuma consulta agendada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
