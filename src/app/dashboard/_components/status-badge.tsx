interface StatusStyle {
  bg: string;
  color: string;
  label: string;
}

export const PAYMENT_STATUS_STYLE: Record<string, StatusStyle> = {
  pending: { bg: "#FEF3C7", color: "#B45309", label: "Pendente" },
  paid: { bg: "#D1FAE5", color: "#047857", label: "Pago" },
  overdue: { bg: "#FFE4E6", color: "#BE123C", label: "Atrasado" },
  cancelled: { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelado" },
};

export const CONVERSATION_STATUS_STYLE: Record<string, StatusStyle> = {
  active: { bg: "#D1FAE5", color: "#047857", label: "Ativa" },
  escalated: { bg: "#FFE4E6", color: "#BE123C", label: "Escalada" },
  closed: { bg: "#F1F5F9", color: "#475569", label: "Encerrada" },
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
