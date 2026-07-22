"use client";

import { useMemo } from "react";
import { dentistColorMap } from "../_components/provider-colors";
import { APPOINTMENT_STATUS_STYLE } from "../_components/status-badge";
import {
  formatClockFromMinutes,
  GRID_END_HOUR,
  GRID_HEIGHT_PX,
  GRID_START_HOUR,
  HEADER_HEIGHT_PX,
  heightPx,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  topPx,
} from "./grid-math";

export interface DayGridAppointment {
  id: string;
  dentistId: string;
  patientName: string;
  service: string | null;
  status: string;
  startMinutes: number;
  durationMinutes: number;
  timeLabel: string;
}

export interface DayGridDentist {
  id: string;
  name: string;
}

export interface DayGridProps {
  dentists: DayGridDentist[];
  appointments: DayGridAppointment[];
  onSlotClick: (input: { dentistId: string; startMinutes: number }) => void;
  onAppointmentClick: (appointmentId: string) => void;
}

export function DayGrid({ dentists, appointments, onSlotClick, onAppointmentClick }: DayGridProps) {
  const colorByDentist = useMemo(() => dentistColorMap(dentists), [dentists]);

  const byDentist = useMemo(() => {
    const map = new Map<string, DayGridAppointment[]>();
    for (const appt of appointments) {
      const list = map.get(appt.dentistId) ?? [];
      list.push(appt);
      map.set(appt.dentistId, list);
    }
    return map;
  }, [appointments]);

  const hourLabels = useMemo(() => {
    const labels: { label: string; top: number }[] = [];
    for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) {
      labels.push({ label: `${String(hour).padStart(2, "0")}:00`, top: ((hour - GRID_START_HOUR) * 60 / SLOT_MINUTES) * SLOT_HEIGHT_PX });
    }
    return labels;
  }, []);

  const slotStarts = useMemo(() => {
    const starts: number[] = [];
    for (let m = 0; m < (GRID_END_HOUR - GRID_START_HOUR) * 60; m += SLOT_MINUTES) starts.push(m);
    return starts;
  }, []);

  if (dentists.length === 0) {
    return (
      <div className="rounded-[10px] border border-border bg-background p-8 text-center text-sm text-ink-muted">
        Cadastre ao menos um dentista para ver a agenda.
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto rounded-[10px] border border-border bg-background">
      <div className="relative w-15 shrink-0" style={{ height: GRID_HEIGHT_PX + HEADER_HEIGHT_PX, marginTop: HEADER_HEIGHT_PX }}>
        {hourLabels.map((hl) => (
          <div key={hl.label} className="absolute right-2 -translate-y-1/2 text-[11px] text-ink-muted" style={{ top: hl.top }}>
            {hl.label}
          </div>
        ))}
      </div>

      {dentists.map((dentist) => {
        const color = colorByDentist.get(dentist.id)!;
        return (
          <div key={dentist.id} className="min-w-[180px] flex-1 border-l border-border first:border-l-0">
            <div
              className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-2"
              style={{ height: HEADER_HEIGHT_PX }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
              <span className="truncate text-sm font-semibold text-ink-strong">{dentist.name}</span>
            </div>
            <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
              {slotStarts.map((startMinutes) => (
                <button
                  key={startMinutes}
                  type="button"
                  aria-label={`Novo agendamento às ${formatClockFromMinutes(startMinutes)} com ${dentist.name}`}
                  className="absolute inset-x-0 border-b border-dashed border-border/70 hover:bg-app-bg"
                  style={{ top: topPx(startMinutes), height: SLOT_HEIGHT_PX }}
                  onClick={() => onSlotClick({ dentistId: dentist.id, startMinutes })}
                />
              ))}

              {(byDentist.get(dentist.id) ?? []).map((appt) => {
                const clampedTop = Math.min(Math.max(topPx(appt.startMinutes), 0), GRID_HEIGHT_PX);
                const style = APPOINTMENT_STATUS_STYLE[appt.status];
                return (
                  <button
                    key={appt.id}
                    type="button"
                    className="absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-1 text-left text-white shadow-sm"
                    style={{
                      top: clampedTop,
                      height: Math.max(heightPx(appt.durationMinutes), 18),
                      background: color,
                      borderLeft: `3px solid ${style?.color ?? "#1D4ED8"}`,
                      opacity: appt.status === "cancelled" ? 0.55 : 1,
                      zIndex: 1,
                    }}
                    onClick={() => onAppointmentClick(appt.id)}
                  >
                    <div className="truncate text-xs font-bold">{appt.patientName}</div>
                    <div className="truncate text-[11px] opacity-90">
                      {appt.service ? `${appt.service} · ` : ""}
                      {appt.timeLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
