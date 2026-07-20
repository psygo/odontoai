import { createHmac, timingSafeEqual } from "crypto";

const GRAPH_API_VERSION = "v21.0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function sendWhatsAppText(phoneNumberId: string, to: string, body: string): Promise<void> {
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${errorBody}`);
  }
}

// Meta signs the raw request body with the app secret; compare against the
// X-Hub-Signature-256 header to make sure the webhook really came from Meta.
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const appSecret = requireEnv("WHATSAPP_APP_SECRET");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export interface InboundWhatsAppMessage {
  phoneNumberId: string;
  from: string;
  // Canonical WhatsApp ID to send replies to. For most countries this equals
  // `from`, but Brazilian numbers can have a mismatched `messages[].from` due
  // to the extra mobile "9" digit — sending to `from` is silently accepted by
  // the Graph API but never delivered. Always reply to `waId`, not `from`.
  waId: string;
  text: string;
  waMessageId: string;
}

// Parses the Meta webhook payload shape and returns only text messages;
// other change/message types (status updates, media, etc.) return null.
export function parseInboundWhatsAppMessage(payload: unknown): InboundWhatsAppMessage | null {
  const entry = (payload as { entry?: unknown[] })?.entry?.[0] as
    | { changes?: unknown[] }
    | undefined;
  const change = entry?.changes?.[0] as { value?: unknown } | undefined;
  const value = change?.value as
    | {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string }[];
        messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[];
      }
    | undefined;

  const message = value?.messages?.[0];
  const phoneNumberId = value?.metadata?.phone_number_id;

  if (!message || !phoneNumberId || message.type !== "text" || !message.text?.body || !message.from || !message.id) {
    return null;
  }

  return {
    phoneNumberId,
    from: message.from,
    waId: value?.contacts?.[0]?.wa_id ?? message.from,
    text: message.text.body,
    waMessageId: message.id,
  };
}
