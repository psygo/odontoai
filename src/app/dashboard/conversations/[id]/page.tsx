import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { CONVERSATION_STATUS_STYLE, StatusBadge } from "../../_components/status-badge";
import { extractText } from "../message-text";

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.clinicId, clinicId)),
    with: {
      patient: { columns: { id: true, name: true, phone: true } },
      messages: { orderBy: (m, { asc }) => [asc(m.createdAt)] },
    },
  });

  if (!conversation) {
    notFound();
  }

  const bubbles = conversation.messages
    .map((m) => ({ id: m.id, role: m.role, text: extractText(m.content), createdAt: m.createdAt }))
    .filter((m): m is { id: string; role: "user" | "assistant"; text: string; createdAt: Date } => m.text !== null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/conversations" className="text-xs font-semibold text-accent-blue">
            ← Conversas
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <Link href={`/dashboard/patients/${conversation.patient.id}`} className="text-lg font-extrabold text-ink-strong hover:underline">
              {conversation.patient.name}
            </Link>
            <StatusBadge {...CONVERSATION_STATUS_STYLE[conversation.status]} />
          </div>
          <div className="text-xs text-ink-muted">{conversation.patient.phone}</div>
        </div>
      </div>

      {conversation.status === "escalated" && conversation.escalationReason && (
        <div className="rounded-[10px] border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#BE123C]">
          <span className="font-bold">Escalada para atendimento humano:</span> {conversation.escalationReason}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-background p-5">
        {bubbles.map((m) => (
          <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
              style={
                m.role === "assistant"
                  ? { background: "#14B8A6", color: "#fff", borderBottomRightRadius: 4 }
                  : { background: "#F1F5F9", color: "#1E293B", borderBottomLeftRadius: 4 }
              }
            >
              {m.text}
              <div
                className="mt-1 text-right text-[10px]"
                style={{ color: m.role === "assistant" ? "rgba(255,255,255,0.75)" : "#94A3B8" }}
              >
                {m.createdAt.toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
        {bubbles.length === 0 && <div className="py-8 text-center text-sm text-ink-muted">Nenhuma mensagem nesta conversa.</div>}
      </div>
    </div>
  );
}
