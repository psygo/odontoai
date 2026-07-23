import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversations, customers, payments } from "@/db/schema";
import { extractText } from "./conversations/message-text";
import { formatCents } from "./_components/format";
import { CONVERSATION_STATUS_STYLE, StatusBadge } from "./_components/status-badge";

export default async function DashboardHomePage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [customerRows, allPayments, recentConversations, recentPayments] = await Promise.all([
    db.query.customers.findMany({
      where: eq(customers.clinicId, clinicId),
      columns: { id: true },
    }),
    db.query.payments.findMany({
      where: eq(payments.clinicId, clinicId),
      columns: { status: true, amountCents: true },
    }),
    db.query.conversations.findMany({
      where: eq(conversations.clinicId, clinicId),
      orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
      with: {
        customer: { columns: { name: true } },
        messages: { orderBy: (m, { desc }) => [desc(m.createdAt)], limit: 5 },
      },
      limit: 5,
    }),
    db.query.payments.findMany({
      where: eq(payments.clinicId, clinicId),
      with: { customer: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
      limit: 4,
    }),
  ]);

  const outstandingCents = allPayments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amountCents, 0);
  const receivedCents = allPayments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountCents, 0);
  const activeConversationCount = recentConversations.filter((c) => c.status === "active").length;

  const stats = [
    { label: "Clientes cadastrados", value: String(customerRows.length), color: "#0B2A45" },
    { label: "Conversas ativas", value: String(activeConversationCount), color: "#047857" },
    { label: "Saldo em aberto", value: formatCents(outstandingCents), color: "#D97706" },
    { label: "Total recebido", value: formatCents(receivedCents), color: "#0D9488" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3.5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[10px] border border-border bg-background px-4.5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{stat.label}</div>
            <div className="mt-1.5 text-2xl font-extrabold" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="overflow-hidden rounded-[10px] border border-border bg-background">
          <div className="border-b border-border bg-app-bg px-4 py-3 text-xs font-bold text-ink-strong">
            Conversas recentes
          </div>
          {recentConversations.map((conversation) => {
            const preview = conversation.messages.map((m) => extractText(m.content)).find((t) => t !== null) ?? "(sem texto)";
            return (
              <Link
                key={conversation.id}
                href={`/dashboard/conversations/${conversation.id}`}
                className="flex items-center gap-3 border-b border-border/60 px-4 py-3 hover:bg-app-bg"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{conversation.customer.name}</div>
                  <div className="truncate text-xs text-ink-faint">{preview}</div>
                </div>
                <StatusBadge {...CONVERSATION_STATUS_STYLE[conversation.status]} />
              </Link>
            );
          })}
          {recentConversations.length === 0 && (
            <div className="px-8 py-8 text-center text-sm text-ink-muted">Nenhuma conversa ainda.</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[10px] border border-border bg-background p-4">
            <div className="mb-3 text-xs font-bold text-ink-strong">Ações rápidas</div>
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard/customers?new=1"
                className="rounded-lg bg-accent-blue px-3 py-2.5 text-left text-sm font-bold text-white"
              >
                + Novo Cliente
              </Link>
              <Link
                href="/dashboard/payments?new=1"
                className="rounded-lg bg-accent-teal px-3 py-2.5 text-left text-sm font-bold text-white"
              >
                + Novo Pagamento
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-border bg-background">
            <div className="border-b border-border bg-app-bg px-4 py-3 text-xs font-bold text-ink-strong">
              Pagamentos recentes
            </div>
            {recentPayments.map((payment) => (
              <div key={payment.id} className="border-b border-border/60 px-4 py-2.5">
                <div className="flex justify-between">
                  <span className="text-xs font-semibold text-ink">{payment.customer.name}</span>
                  <span className="text-xs text-ink-soft">{formatCents(payment.amountCents)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {payment.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </div>
              </div>
            ))}
            {recentPayments.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-muted">Nenhum pagamento ainda.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
