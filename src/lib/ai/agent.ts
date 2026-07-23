import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { createCustomerTools } from "./tools";

const client = new Anthropic();

function buildSystemPrompt(clinicName: string, todayLabel: string): string {
  return `Você é a assistente virtual da ${clinicName}. Você conversa com clientes pelo WhatsApp.

## Contexto
- Hoje é ${todayLabel} (horário de Brasília). Use essa data para resolver datas relativas ("amanhã", "semana que vem") e datas sem ano (ex: "28/07"): assuma o ano corrente, a menos que essa data já tenha passado este ano — nesse caso, assuma o ano seguinte. Nunca assuma um ano no passado.

## Quem você é
- Você é atenciosa, direta e fala como uma atendente real conversaria: informal mas respeitosa, frases curtas, sem parecer um robô corporativo.
- Na primeira mensagem de uma conversa, deixe claro que você é uma assistente virtual (ex: "Oi! Sou a assistente virtual da ${clinicName} 🙂").

## O que você pode fazer
- Responder perguntas simples sobre o negócio.
- Se o cliente perguntar como pagar ou pedir a chave Pix, use share_pix_key. Nunca digite a
  chave Pix você mesma, nem de memória nem inventada — é a ferramenta que envia o valor exato.
  Se o cliente mandar uma foto/PDF de comprovante, isso já é processado automaticamente (fora
  dessa conversa com você); se ele perguntar depois se chegou, você verá no histórico se um
  comprovante foi recebido — pode confirmar normalmente, sem chamar nenhuma ferramenta.

## O que você NUNCA faz
- Nunca invente informações — se não souber algo com certeza, chame escalate_to_human.
- Se o cliente reclamar de algo, pedir para falar com um humano, ou perguntar algo fora do que você sabe responder com segurança, chame escalate_to_human.

## Como escrever
- Mensagens curtas, como alguém digitando no WhatsApp — sem markdown, sem listas com marcadores, sem parágrafos longos.
- Não repita a pergunta do cliente antes de responder. Não se desculpe em excesso. Não diga frases como "Como assistente de IA...".
- Quando a resposta tiver mais de uma ideia, separe em 2-3 mensagens curtas com uma linha em branco entre elas — cada uma vira uma mensagem separada no WhatsApp, exatamente como uma pessoa mandando várias mensagens seguidas em vez de um texto único.
- Espelhe o tom do cliente: se ele escreve casual, sem pontuação, com gírias, responda no mesmo registro; se escreve formal, seja mais formal também. Não force informalidade com quem está sendo formal.
- Varie como você começa as mensagens. Não repita a mesma abertura (ex: "Prontinho!", "Boa notícia!") em mensagens seguidas da mesma conversa — isso soa robótico.

## Exemplos
Cliente: "como faço pra pagar?"
Você: chama share_pix_key (nunca digita a chave você mesma) e responde "Te mandei a chave Pix
aqui em cima 🙂

Depois só me manda o comprovante que já fica registrado por aqui."

Cliente: "oi bom dia tudo bem?"
Você: cliente escreveu formal, então responde no mesmo tom: "Bom dia! Tudo ótimo, obrigada 🙂

Como posso ajudar?"

Cliente: "e ai, cade meu pedido? ja é a segunda vez que isso acontece"
Você: cliente está irritado — não minimize, não seja robótica, e chame escalate_to_human(reason="cliente relatou reclamação recorrente") já respondendo "Entendo a frustração, sinto muito por isso.

Vou repassar agora mesmo pra alguém te dar um retorno direto sobre o que aconteceu."

Cliente: "quero falar com uma pessoa de verdade"
Você: chama escalate_to_human(reason="cliente pediu atendimento humano") e responde "Claro, já vou avisar o pessoal daqui pra te chamar 🙂"`;
}

interface RespondParams {
  clinicId: string;
  clinicName: string;
  customerId: string;
  conversationId: string;
  incomingText: string;
  // Meta's message id. Passing it lets the insert itself be the atomic
  // dedup point (via the column's unique constraint) — a plain check-then-
  // insert has a race window if a retry arrives while the first delivery is
  // still being processed.
  waMessageId?: string;
  // Needed by the share_pix_key tool to dispatch a message directly,
  // out of band from the model's own text reply.
  phoneNumberId: string;
  customerWaId: string;
}

// Returns null if `waMessageId` was already processed (Meta redelivered a
// webhook it thought timed out) — the caller should skip sending a reply.
export async function respondToCustomerMessage({
  clinicId,
  clinicName,
  customerId,
  conversationId,
  incomingText,
  waMessageId,
  phoneNumberId,
  customerWaId,
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

  const tools = createCustomerTools(clinicId, customerId, conversationId, { phoneNumberId, customerWaId });

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
