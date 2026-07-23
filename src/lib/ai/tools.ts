import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clinics, conversations } from "@/db/schema";
import { sendWhatsAppReply } from "@/lib/whatsapp";

interface WhatsAppContext {
  phoneNumberId: string;
  customerWaId: string;
}

export function createCustomerTools(
  clinicId: string,
  customerId: string,
  conversationId: string,
  whatsapp: WhatsAppContext,
) {
  const escalateToHuman = betaZodTool({
    name: "escalate_to_human",
    description:
      "Flag this conversation for staff to follow up personally. Use for complaints, anything urgent or sensitive, or anything you're not confident answering on your own.",
    inputSchema: z.object({
      reason: z.string(),
    }),
    run: async ({ reason }) => {
      await db
        .update(conversations)
        .set({ status: "escalated", escalationReason: reason })
        .where(eq(conversations.id, conversationId));
      return JSON.stringify({ ok: true });
    },
  });

  // The key is sent directly here, never through the model's own generated
  // text — a Pix key is a financial routing value, and a single hallucinated
  // or transposed character would misdirect a real payment. The model only
  // learns whether the send succeeded, never the key itself.
  const sharePixKey = betaZodTool({
    name: "share_pix_key",
    description:
      "Send the business's Pix key directly to the customer on WhatsApp, so they can pay. Use when the customer asks how to pay or asks for the Pix key/QR.",
    inputSchema: z.object({}),
    run: async () => {
      const clinic = await db.query.clinics.findFirst({
        where: eq(clinics.id, clinicId),
        columns: { pixKey: true },
      });
      if (!clinic?.pixKey) {
        return JSON.stringify({ ok: false, error: "This business has no Pix key configured yet." });
      }

      try {
        await sendWhatsAppReply(whatsapp.phoneNumberId, whatsapp.customerWaId, clinic.pixKey);
      } catch (error) {
        console.error("share_pix_key: WhatsApp dispatch failed:", error);
        return JSON.stringify({ ok: false, error: "WhatsApp send failed, ask the customer to try again shortly." });
      }

      return JSON.stringify({ ok: true });
    },
  });

  return [escalateToHuman, sharePixKey];
}
