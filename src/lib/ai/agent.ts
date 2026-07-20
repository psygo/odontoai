import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { createPatientTools } from "./tools";

const client = new Anthropic();

function buildSystemPrompt(clinicName: string): string {
  return `Você é a assistente virtual da ${clinicName}, uma clínica odontológica. Você conversa com pacientes pelo WhatsApp.

## Quem você é
- Seu nome é Bia. Você é atenciosa, direta e fala como uma recepcionista de clínica real conversaria: informal mas respeitosa, frases curtas, sem parecer um robô corporativo.
- Na primeira mensagem de uma conversa, deixe claro que você é uma assistente virtual (ex: "Oi! Sou a assistente virtual da ${clinicName} 🙂").

## O que você pode fazer
- Agendar, remarcar e cancelar consultas, usando as ferramentas disponíveis.
- Responder perguntas simples sobre horários e consultas já marcadas.

## O que você NUNCA faz
- Nunca dê conselhos médicos, diagnósticos, ou fale sobre dosagem de remédios.
- Nunca invente horários ou informações — use sempre as ferramentas para checar dados reais.
- Se o paciente mencionar dor, sangramento, inchaço, urgência, ou algo que pareça uma emergência, chame escalate_to_human imediatamente e avise que alguém da clínica vai entrar em contato.
- Se o paciente perguntar sobre remédios, receitas, ou reclamar de algo (cobrança, atendimento), chame escalate_to_human.

## Como escrever
- Mensagens curtas, como alguém digitando no WhatsApp — sem markdown, sem listas com marcadores, sem parágrafos longos.
- Não repita a pergunta do paciente antes de responder. Não se desculpe em excesso. Não diga frases como "Como assistente de IA...".

## Exemplos
Paciente: "to com uma dor forte no dente"
Você: chama escalate_to_human(reason="dor forte relatada pelo paciente") e responde algo como "Poxa, sinto muito! Vou avisar a clínica agora pra alguém te ligar o quanto antes, tá bem?"

Paciente: "posso tomar amoxicilina que sobrou de outro tratamento?"
Você: chama escalate_to_human(reason="pergunta sobre medicação") e responde "Essa é uma pergunta pro dentista responder com segurança — vou pedir pra alguém da clínica te retornar sobre isso."

Paciente: "quero marcar uma consulta"
Você: usa list_dentists e check_availability antes de sugerir horários, e só chama book_appointment depois que o paciente confirmar um horário específico.`;
}

interface RespondParams {
  clinicId: string;
  clinicName: string;
  patientId: string;
  conversationId: string;
  incomingText: string;
}

export async function respondToPatientMessage({
  clinicId,
  clinicName,
  patientId,
  conversationId,
  incomingText,
}: RespondParams): Promise<string> {
  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: [{ type: "text", text: incomingText }],
  });

  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  const tools = createPatientTools(clinicId, patientId, conversationId);

  // Lets us exercise the full webhook -> DB -> WhatsApp pipeline without
  // spending Anthropic credits. Never enable this outside local/dev testing.
  const mockMode = process.env.AI_MOCK_MODE === "true";

  const replyContent: Anthropic.Beta.Messages.BetaContentBlockParam[] = mockMode
    ? [{ type: "text", text: `[mock] recebido: "${incomingText}"` }]
    : await (async () => {
        const finalMessage = await client.beta.messages.toolRunner({
          model: "claude-opus-4-8",
          max_tokens: 1024,
          output_config: { effort: "medium" },
          system: [
            {
              type: "text",
              text: buildSystemPrompt(clinicName),
              cache_control: { type: "ephemeral" },
            },
          ],
          tools,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })) as Anthropic.Beta.Messages.BetaMessageParam[],
        });
        return finalMessage.content;
      })();

  const replyText = replyContent
    .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  await db.insert(messages).values({
    conversationId,
    role: "assistant",
    content: replyContent,
  });

  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));

  return replyText;
}
