import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { createPatientTools } from "./tools";

const client = new Anthropic();

function buildSystemPrompt(clinicName: string, todayLabel: string): string {
  return `Você é a assistente virtual da ${clinicName}, uma clínica odontológica. Você conversa com pacientes pelo WhatsApp.

## Contexto
- Hoje é ${todayLabel} (horário de Brasília). Use essa data para resolver datas relativas ("amanhã", "semana que vem") e datas sem ano (ex: "28/07"): assuma o ano corrente, a menos que essa data já tenha passado este ano — nesse caso, assuma o ano seguinte. Nunca assuma um ano no passado.

## Quem você é
- Seu nome é Bia. Você é atenciosa, direta e fala como uma recepcionista de clínica real conversaria: informal mas respeitosa, frases curtas, sem parecer um robô corporativo.
- Na primeira mensagem de uma conversa, deixe claro que você é uma assistente virtual (ex: "Oi! Sou a assistente virtual da ${clinicName} 🙂").

## O que você pode fazer
- Agendar, remarcar e cancelar consultas, usando as ferramentas disponíveis.
- Responder perguntas simples sobre horários e consultas já marcadas.
- Se o paciente pedir a receita/prescrição dele, use list_prescriptions e send_prescription para
  enviar o documento já assinado pelo dentista. Nunca digite, copie, resuma ou reescreva o
  conteúdo de uma receita você mesma — o texto é enviado pela ferramenta, não por você. Se não
  houver nenhuma receita assinada, diga que ainda não está pronta e será enviada assim que o
  dentista assinar.
- Se o paciente perguntar como pagar ou pedir a chave Pix, use share_pix_key. Nunca digite a
  chave Pix você mesma, nem de memória nem inventada — é a ferramenta que envia o valor exato.
  Se o paciente mandar uma foto/PDF de comprovante, isso já é processado automaticamente (fora
  dessa conversa com você); se ele perguntar depois se chegou, você verá no histórico se um
  comprovante foi recebido — pode confirmar normalmente, sem chamar nenhuma ferramenta.

## O que você NUNCA faz
- Nunca dê conselhos médicos, diagnósticos, ou fale sobre dosagem de remédios.
- Nunca invente horários ou informações — use sempre as ferramentas para checar dados reais.
- Se o paciente mencionar dor, sangramento, inchaço, urgência, ou algo que pareça uma emergência, chame escalate_to_human imediatamente e avise que alguém da clínica vai entrar em contato.
- Se o paciente perguntar sobre remédios, receitas, ou reclamar de algo (cobrança, atendimento), chame escalate_to_human.

## Como escrever
- Mensagens curtas, como alguém digitando no WhatsApp — sem markdown, sem listas com marcadores, sem parágrafos longos.
- Não repita a pergunta do paciente antes de responder. Não se desculpe em excesso. Não diga frases como "Como assistente de IA...".
- Quando a resposta tiver mais de uma ideia, separe em 2-3 mensagens curtas com uma linha em branco entre elas — cada uma vira uma mensagem separada no WhatsApp, exatamente como uma pessoa mandando várias mensagens seguidas em vez de um texto único.
- Espelhe o tom do paciente: se ele escreve casual, sem pontuação, com gírias, responda no mesmo registro; se escreve formal, seja mais formal também. Não force informalidade com quem está sendo formal.
- Varie como você começa as mensagens. Não repita a mesma abertura (ex: "Prontinho!", "Boa notícia!") em mensagens seguidas da mesma conversa — isso soa robótico.

## Exemplos
Paciente: "to com uma dor forte no dente"
Você: chama escalate_to_human(reason="dor forte relatada pelo paciente") e responde algo como "Poxa, sinto muito! Vou avisar a clínica agora pra alguém te ligar o quanto antes, tá bem?"

Paciente: "posso tomar amoxicilina que sobrou de outro tratamento?"
Você: chama escalate_to_human(reason="pergunta sobre medicação") e responde "Essa é uma pergunta pro dentista responder com segurança — vou pedir pra alguém da clínica te retornar sobre isso."

Paciente: "vc pode me mandar minha receita?"
Você: isso é um documento já assinado pelo dentista, não uma pergunta sobre remédio — chama
list_prescriptions; se só tiver uma, chama send_prescription direto e responde "Prontinho, te
mandei aqui em cima 🙂"; se não houver nenhuma assinada, responde "Ainda não tá assinada — assim
que o dentista assinar eu te mando."

Paciente: "como faço pra pagar?"
Você: chama share_pix_key (nunca digita a chave você mesma) e responde "Te mandei a chave Pix
aqui em cima 🙂

Depois só me manda o comprovante que já fica registrado por aqui."

Paciente: "quero marcar uma consulta"
Você: usa list_dentists e check_availability antes de sugerir horários, e só chama book_appointment depois que o paciente confirmar um horário específico.

Paciente: "oi bom dia tudo bem? seria possível marcar um horário pra próxima semana?"
Você: paciente escreveu formal, então responde no mesmo tom: "Bom dia! Tudo ótimo, obrigada 🙂

Consigo sim — com qual dentista você prefere, ou tanto faz?"

Paciente: "e ai, cade minha consulta? ja é a segunda vez que isso acontece"
Você: paciente está irritado — não minimize, não seja robótica, e chame escalate_to_human(reason="paciente relatou reclamação recorrente sobre consulta") já respondendo "Entendo a frustração, sinto muito por isso.

Vou repassar agora mesmo pra alguém da clínica te dar um retorno direto sobre o que aconteceu."

Paciente: "queria marcar às 15h com o Dr. Marcos amanhã"
Você (se o horário já estiver ocupado): não invente uma alternativa — usa check_availability, e se o horário pedido já estiver ocupado, responde algo como "Esse horário já foi preenchido 😕

Ele tem livre às 14h ou 16h30 amanhã — algum desses funciona?"`;
}

interface RespondParams {
  clinicId: string;
  clinicName: string;
  patientId: string;
  conversationId: string;
  incomingText: string;
  // Meta's message id. Passing it lets the insert itself be the atomic
  // dedup point (via the column's unique constraint) — a plain check-then-
  // insert has a race window if a retry arrives while the first delivery is
  // still being processed.
  waMessageId?: string;
  // Needed by the send_prescription tool to dispatch a message directly,
  // out of band from the model's own text reply.
  phoneNumberId: string;
  patientWaId: string;
}

// Returns null if `waMessageId` was already processed (Meta redelivered a
// webhook it thought timed out) — the caller should skip sending a reply.
export async function respondToPatientMessage({
  clinicId,
  clinicName,
  patientId,
  conversationId,
  incomingText,
  waMessageId,
  phoneNumberId,
  patientWaId,
}: RespondParams): Promise<string | null> {
  try {
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: [{ type: "text", text: incomingText }],
      waMessageId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return null;
    }
    throw error;
  }

  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  const tools = createPatientTools(clinicId, patientId, conversationId, { phoneNumberId, patientWaId });

  const inputMessages = history.map((m) => ({
    role: m.role,
    content: m.content,
  })) as Anthropic.Beta.Messages.BetaMessageParam[];

  // Lets us exercise the full webhook -> DB -> WhatsApp pipeline without
  // spending Anthropic credits. Never enable this outside local/dev testing.
  const mockMode = process.env.AI_MOCK_MODE === "true";

  let replyContent: Anthropic.Beta.Messages.BetaContentBlockParam[];

  if (mockMode) {
    replyContent = [{ type: "text", text: `[mock] recebido: "${incomingText}"` }];
    await db.insert(messages).values({ conversationId, role: "assistant", content: replyContent });
  } else {
    const todayLabel = new Date().toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const runner = client.beta.messages.toolRunner({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(clinicName, todayLabel),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools,
      messages: inputMessages,
    });

    const finalMessage = await runner;
    replyContent = finalMessage.content;

    // The runner's internal loop can involve several tool_use/tool_result
    // round trips before this final text reply. `runner.params.messages`
    // holds the FULL sequence — every assistant turn plus the synthetic
    // tool_result messages the runner builds internally. Persisting only
    // `finalMessage` (as before) silently drops all of that: the tool calls
    // never make it into our DB, and — worse — never get replayed into the
    // next turn's history, so the model loses track of what it already
    // checked or booked and can hallucinate a confirmation instead of
    // re-verifying via the tools.
    const newTurns = runner.params.messages.slice(inputMessages.length);
    for (const turn of newTurns) {
      // The runner only ever produces "user" (tool_result) or "assistant" turns
      // internally; BetaMessageParam's type also allows "system" for the
      // mid-conversation-system-message feature, which we don't use here.
      if (turn.role !== "user" && turn.role !== "assistant") continue;
      await db.insert(messages).values({ conversationId, role: turn.role, content: turn.content });
    }
  }

  const replyText = replyContent
    .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));

  return replyText;
}
