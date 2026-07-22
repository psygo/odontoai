import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { initials } from "../_components/format";
import { CONVERSATION_STATUS_STYLE, StatusBadge } from "../_components/status-badge";
import { extractText } from "./message-text";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const { patientId } = await searchParams;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const rows = await db.query.conversations.findMany({
    where: patientId
      ? and(eq(conversations.clinicId, clinicId), eq(conversations.patientId, patientId))
      : eq(conversations.clinicId, clinicId),
    orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
    with: {
      patient: { columns: { name: true, phone: true } },
      messages: { orderBy: (m, { desc }) => [desc(m.createdAt)], limit: 5 },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-ink-strong">Conversas</h1>
        {patientId && (
          <Link href="/dashboard/conversations" className="text-xs font-semibold text-accent-blue">
            Ver todas as conversas
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-background">
        <div className="grid grid-cols-[auto_1.4fr_2fr_auto_auto] items-center gap-3 border-b border-border bg-app-bg px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
          <div />
          <div>Paciente</div>
          <div>Última mensagem</div>
          <div>Status</div>
          <div></div>
        </div>
        {rows.map((c) => {
          const preview = c.messages.map((m) => extractText(m.content)).find((t) => t !== null) ?? "(sem texto)";
          return (
            <Link
              key={c.id}
              href={`/dashboard/conversations/${c.id}`}
              className="grid grid-cols-[auto_1.4fr_2fr_auto_auto] items-center gap-3 border-b border-border/60 px-4 py-3 text-sm hover:bg-app-bg"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-extrabold text-accent-blue">
                {initials(c.patient.name)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{c.patient.name}</div>
                <div className="truncate text-xs text-ink-muted">{c.patient.phone}</div>
              </div>
              <div className="truncate text-ink-faint">{preview}</div>
              <div>
                <StatusBadge {...CONVERSATION_STATUS_STYLE[c.status]} />
              </div>
              <div className="whitespace-nowrap text-xs text-ink-muted">
                {c.lastMessageAt.toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-ink-muted">Nenhuma conversa encontrada.</div>}
      </div>
    </div>
  );
}
