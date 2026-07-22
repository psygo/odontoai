interface StatusStyle {
  bg: string;
  color: string;
  label: string;
}

export const APPOINTMENT_STATUS_STYLE: Record<string, StatusStyle> = {
  scheduled: { bg: "#FEF3C7", color: "#B45309", label: "Pendente" },
  confirmed: { bg: "#DBEAFE", color: "#1D4ED8", label: "Confirmado" },
  completed: { bg: "#D1FAE5", color: "#047857", label: "Concluído" },
  cancelled: { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelado" },
  no_show: { bg: "#FFEDD5", color: "#C2410C", label: "Faltou" },
};

export const PAYMENT_STATUS_STYLE: Record<string, StatusStyle> = {
  pending: { bg: "#FEF3C7", color: "#B45309", label: "Pendente" },
  paid: { bg: "#D1FAE5", color: "#047857", label: "Pago" },
  overdue: { bg: "#FFE4E6", color: "#BE123C", label: "Atrasado" },
  cancelled: { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelado" },
};

export const PRESCRIPTION_STATUS_STYLE: Record<string, StatusStyle> = {
  draft: { bg: "#F1F5F9", color: "#475569", label: "Rascunho" },
  signed: { bg: "#EDE9FE", color: "#6D28D9", label: "Assinada" },
};

export function StatusBadge({ bg, color, label }: StatusStyle) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}
