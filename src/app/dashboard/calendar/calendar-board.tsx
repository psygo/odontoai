"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppointmentModal, type AppointmentModalState } from "./appointment-modal";
import { DayGrid, type DayGridAppointment, type DayGridDentist } from "./day-grid";
import { formatClockFromMinutes } from "./grid-math";

export interface CalendarBoardAppointment extends DayGridAppointment {
  patientId: string;
  patientPhone: string;
  dentistName: string;
  notes: string | null;
  hasPayment: boolean;
}

export function CalendarBoard({
  date,
  dentists,
  appointments,
  patients,
}: {
  date: string;
  dentists: DayGridDentist[];
  appointments: CalendarBoardAppointment[];
  patients: { id: string; name: string }[];
}) {
  const [modal, setModal] = useState<AppointmentModalState>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const newFlag = searchParams.get("new");
  const prefillPatientId = searchParams.get("patientId") ?? undefined;
  // Initialized to null (not newFlag) so a "?new=1" present on the very
  // first render still counts as a change and opens the modal on load —
  // not just on later client-side navigations to this same mounted page.
  const [prevNewFlag, setPrevNewFlag] = useState<string | null>(null);

  // Adjusted during render rather than in an effect (see appointment-modal.tsx)
  // — only the URL cleanup below is a genuine external-system side effect.
  if (newFlag !== prevNewFlag) {
    setPrevNewFlag(newFlag);
    if (newFlag === "1") {
      setModal({ mode: "create", dateStr: date, patientId: prefillPatientId });
    }
  }

  useEffect(() => {
    if (newFlag === "1") {
      router.replace("/dashboard/calendar");
    }
  }, [newFlag, router]);

  function openDetail(appointmentId: string) {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return;
    setModal({
      mode: "detail",
      appointment: {
        id: appt.id,
        patientId: appt.patientId,
        patientName: appt.patientName,
        patientPhone: appt.patientPhone,
        dentistId: appt.dentistId,
        dentistName: appt.dentistName,
        service: appt.service,
        status: appt.status,
        dateStr: date,
        timeStr: formatClockFromMinutes(appt.startMinutes),
        durationMinutes: appt.durationMinutes,
        notes: appt.notes,
        hasPayment: appt.hasPayment,
      },
    });
  }

  return (
    <>
      <DayGrid
        dentists={dentists}
        appointments={appointments}
        onSlotClick={({ dentistId, startMinutes }) =>
          setModal({ mode: "create", dentistId, dateStr: date, timeStr: formatClockFromMinutes(startMinutes) })
        }
        onAppointmentClick={openDetail}
      />
      <AppointmentModal state={modal} onClose={() => setModal(null)} patients={patients} dentists={dentists} todayStr={date} />
    </>
  );
}
