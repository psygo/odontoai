export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 18;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT_PX = 36;
export const HEADER_HEIGHT_PX = 36;
export const GRID_HEIGHT_PX = (((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES) * SLOT_HEIGHT_PX;

// Brazil has used a single -03:00 offset nationwide since abolishing DST in
// 2019 — same convention as parseClinicLocalDateTime() in calendar/actions.ts.
const CLINIC_UTC_OFFSET = "-03:00";
const CLINIC_TZ = "America/Sao_Paulo";

export function isValidDateStr(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dayRangeUtc(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00${CLINIC_UTC_OFFSET}`),
    end: new Date(`${dateStr}T23:59:59.999${CLINIC_UTC_OFFSET}`),
  };
}

function clinicHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return {
    hour: Number(parts.find((p) => p.type === "hour")!.value),
    minute: Number(parts.find((p) => p.type === "minute")!.value),
  };
}

// Minutes since GRID_START_HOUR:00, in clinic-local time — can be negative or
// exceed GRID_HEIGHT_PX for an appointment outside the fixed 8–18 grid window;
// callers should clamp before rendering.
export function minutesSinceGridStart(date: Date): number {
  const { hour, minute } = clinicHourMinute(date);
  return (hour - GRID_START_HOUR) * 60 + minute;
}

export function clockLabel(date: Date): string {
  const { hour, minute } = clinicHourMinute(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export const topPx = (startMinutes: number) => (startMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX;
export const heightPx = (durationMinutes: number) => Math.max(0, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT_PX - 2);

export function formatClockFromMinutes(minutesSinceStart: number): string {
  const total = GRID_START_HOUR * 60 + minutesSinceStart;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function todayInClinicTZ(): string {
  return clinicDateStr(new Date());
}

export function clinicDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TZ }).format(date);
}

// Anchored at UTC noon so adding/subtracting days never rolls over to the
// wrong calendar date regardless of the server's own timezone.
export function shiftDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLongPtBr(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function clinicLocalDateTime(dateStr: string, hour: number, minute: number): Date {
  return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${CLINIC_UTC_OFFSET}`);
}
