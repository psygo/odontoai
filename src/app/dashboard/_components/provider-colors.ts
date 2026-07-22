// Cycled by index over a clinic's (dynamic, unbounded) dentist list — the
// design reference assumes a fixed 4 providers with fixed colors, but real
// clinics can have any number, so this wraps around instead.
const PROVIDER_PALETTE = ["#2563EB", "#7C3AED", "#0D9488", "#EA580C", "#DB2777", "#0891B2"];

export function getProviderColor(index: number): string {
  return PROVIDER_PALETTE[index % PROVIDER_PALETTE.length];
}

// Stable id->color mapping given a canonically-ordered (e.g. name-sorted)
// dentist list, so the same dentist gets the same color across the
// dashboard, calendar, and appointments pages.
export function dentistColorMap(dentists: { id: string }[]): Map<string, string> {
  return new Map(dentists.map((dentist, index) => [dentist.id, getProviderColor(index)]));
}
