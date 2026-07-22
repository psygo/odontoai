// Fixed catalog, not a DB table — matches the design reference exactly and
// only needs to support a price lookup when generating a billing entry from
// a completed appointment. Values in cents (BRL), consistent with payments.amountCents.
export const SERVICE_OPTIONS = [
  "Consulta",
  "Limpeza",
  "Restauração",
  "Canal",
  "Extração",
  "Clareamento",
  "Avaliação",
  "Ajuste ortodôntico",
] as const;

export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const SERVICE_PRICE_CENTS: Record<ServiceOption, number> = {
  Consulta: 8000,
  Limpeza: 15000,
  Restauração: 18000,
  Canal: 90000,
  Extração: 22000,
  Clareamento: 35000,
  Avaliação: 12000,
  "Ajuste ortodôntico": 15000,
};

export function priceForService(service: string | null): number {
  if (service && service in SERVICE_PRICE_CENTS) {
    return SERVICE_PRICE_CENTS[service as ServiceOption];
  }
  return 10000;
}
