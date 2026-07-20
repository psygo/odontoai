"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#2563eb",
  confirmed: "#16a34a",
  completed: "#6b7280",
  cancelled: "#dc2626",
  no_show: "#ea580c",
};

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  patientId: string;
}

export function FullCalendarView({ events }: { events: CalendarEvent[] }) {
  const router = useRouter();

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
      locale={ptBrLocale}
      timeZone="America/Sao_Paulo"
      height="auto"
      nowIndicator
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: STATUS_COLORS[event.status],
        borderColor: STATUS_COLORS[event.status],
        extendedProps: { patientId: event.patientId },
      }))}
      eventClick={(info) => {
        const patientId = info.event.extendedProps.patientId as string;
        router.push(`/dashboard/patients/${patientId}`);
      }}
    />
  );
}
