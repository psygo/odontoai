import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, paymentReceipts, payments } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { downloadWhatsAppMedia, sendWhatsAppReply } from "@/lib/whatsapp";

interface ReceivePaymentReceiptParams {
  clinicId: string;
  patientId: string;
  conversationId: string;
  phoneNumberId: string;
  patientWaId: string;
  mediaId: string;
  waMessageId: string;
}

const ACK_TEXT =
  "Recebi seu comprovante, valeu! 🙏\n\nNossa equipe vai conferir e confirmar por aqui assim que possível.";

// Downloads the receipt image/PDF and stores it. Never marks anything as
// paid automatically — that's always a manual dashboard action (same
// principle as prescriptions requiring a dentist's signature before the
// agent can touch them). If the patient has exactly one pending payment,
// the receipt links to it directly; a patient can have several appointments
// each with their own payment, so anything more ambiguous than that is left
// unmatched for staff to reconcile by hand.
export async function receivePaymentReceipt({
  clinicId,
  patientId,
  conversationId,
  phoneNumberId,
  patientWaId,
  mediaId,
  waMessageId,
}: ReceivePaymentReceiptParams): Promise<void> {
  // Fetching the media first (before any DB writes) means a download failure
  // just propagates and lets Meta's webhook redelivery retry from scratch —
  // nothing has been persisted yet for a retry to collide with.
  const { data, mimeType } = await downloadWhatsAppMedia(mediaId);

  const pendingPayments = await db.query.payments.findMany({
    where: and(eq(payments.clinicId, clinicId), eq(payments.patientId, patientId), eq(payments.status, "pending")),
  });
  const matched = pendingPayments.length === 1 ? pendingPayments[0] : undefined;

  try {
    // Transactional: the receipt row, its conversation log entries, and the
    // conversation timestamp bump either all land or none do. The unique
    // waMessageId on payment_receipts is the atomic dedup point — a plain
    // check-then-insert would have a race window on a fast webhook retry.
    await db.transaction(async (tx) => {
      await tx.insert(paymentReceipts).values({
        clinicId,
        patientId,
        appointmentId: matched?.appointmentId ?? null,
        paymentId: matched?.id ?? null,
        imageData: data,
        mimeType,
        waMessageId,
      });

      await tx.insert(messages).values({
        conversationId,
        role: "user",
        content: [{ type: "text", text: "[Paciente enviou um comprovante de pagamento]" }],
        waMessageId,
      });
      await tx.insert(messages).values({
        conversationId,
        role: "assistant",
        content: [{ type: "text", text: ACK_TEXT }],
      });
      await tx.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
    });
  } catch (error) {
    // Already processed by a prior (retried) webhook delivery — skip re-sending the ack.
    if (isUniqueViolation(error)) return;
    throw error;
  }

  await sendWhatsAppReply(phoneNumberId, patientWaId, ACK_TEXT);
}
