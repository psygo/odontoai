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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A human texting back rarely sends one long paragraph — they send a couple
// of short bubbles in a row. The agent's system prompt is instructed to
// separate those with a blank line; this splits on that and sends each as
// its own message, with a short delay (roughly proportional to how long it'd
// take to type) so replies don't arrive all at once.
export async function sendWhatsAppReply(phoneNumberId: string, to: string, fullText: string): Promise<void> {
  const chunks = fullText
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const [index, chunk] of chunks.entries()) {
    if (index > 0) {
      const delayMs = Math.min(2500, Math.max(600, 400 + chunk.length * 30));
      await sleep(delayMs);
    }
    await sendWhatsAppText(phoneNumberId, to, chunk);
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

interface InboundCommon {
  phoneNumberId: string;
  from: string;
  // Canonical WhatsApp ID to send replies to. For most countries this equals
  // `from`, but Brazilian numbers can have a mismatched `messages[].from` due
  // to the extra mobile "9" digit — sending to `from` is silently accepted by
  // the Graph API but never delivered. Always reply to `waId`, not `from`.
  waId: string;
  waMessageId: string;
}

export interface InboundTextMessage extends InboundCommon {
  type: "text";
  text: string;
}

// A photo or PDF sent as a payment receipt. `mediaId` must be exchanged for
// actual bytes via downloadWhatsAppMedia — Meta never puts the file in the
// webhook payload itself.
export interface InboundMediaMessage extends InboundCommon {
  type: "image" | "document";
  mediaId: string;
  mimeType: string;
}

export type InboundWhatsAppMessage = InboundTextMessage | InboundMediaMessage;

// Parses the Meta webhook payload shape and returns text or image/document
// messages; other types (status updates, audio, stickers, etc.) return null.
export function parseInboundWhatsAppMessage(payload: unknown): InboundWhatsAppMessage | null {
  const entry = (payload as { entry?: unknown[] })?.entry?.[0] as
    | { changes?: unknown[] }
    | undefined;
  const change = entry?.changes?.[0] as { value?: unknown } | undefined;
  const value = change?.value as
    | {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string }[];
        messages?: {
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; mime_type?: string };
          document?: { id?: string; mime_type?: string };
        }[];
      }
    | undefined;

  const message = value?.messages?.[0];
  const phoneNumberId = value?.metadata?.phone_number_id;

  if (!message || !phoneNumberId || !message.from || !message.id) {
    return null;
  }

  const common: InboundCommon = {
    phoneNumberId,
    from: message.from,
    waId: value?.contacts?.[0]?.wa_id ?? message.from,
    waMessageId: message.id,
  };

  if (message.type === "text" && message.text?.body) {
    return { ...common, type: "text", text: message.text.body };
  }
  if (message.type === "image" && message.image?.id) {
    return { ...common, type: "image", mediaId: message.image.id, mimeType: message.image.mime_type ?? "image/jpeg" };
  }
  if (message.type === "document" && message.document?.id) {
    return {
      ...common,
      type: "document",
      mediaId: message.document.id,
      mimeType: message.document.mime_type ?? "application/pdf",
    };
  }

  return null;
}

// Meta never inlines media bytes in the webhook payload — this is the
// documented two-step Graph API exchange: first resolve the media id to a
// short-lived download URL, then fetch that URL (both calls need the same
// bearer token).
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");

  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(`WhatsApp media lookup failed (${metaRes.status}): ${await metaRes.text()}`);
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) {
    throw new Error("WhatsApp media lookup response had no url");
  }

  const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!fileRes.ok) {
    throw new Error(`WhatsApp media download failed (${fileRes.status})`);
  }

  const data = Buffer.from(await fileRes.arrayBuffer());
  return { data, mimeType: meta.mime_type ?? "application/octet-stream" };
}
