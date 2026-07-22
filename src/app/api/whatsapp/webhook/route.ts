import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clinics, conversations, messages, patients } from "@/db/schema";
import { respondToPatientMessage } from "@/lib/ai/agent";
import { receivePaymentReceipt } from "@/lib/receipts";
import { parseInboundWhatsAppMessage, sendWhatsAppReply, verifyWhatsAppSignature } from "@/lib/whatsapp";

// One LLM turn (plus tool calls) can take a while; give it room on serverless.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyWhatsAppSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const inbound = parseInboundWhatsAppMessage(payload);

  // Anything we don't handle (delivery receipts, status updates, audio,
  // stickers, etc.) is acknowledged and ignored.
  if (!inbound) {
    return NextResponse.json({ status: "ignored" });
  }

  // Meta redelivers a webhook it thinks timed out, and a real LLM turn can
  // take long enough to look like one — without this, a single patient
  // message can produce two independent (differently-worded) AI replies.
  // This is just a fast-path optimization (skip patient/conversation work on
  // an obvious duplicate); the real dedup guarantee is the atomic insert
  // inside respondToPatientMessage. So a transient DB error here should fail
  // open (proceed) rather than 500 the whole webhook.
  try {
    const alreadyProcessed = await db.query.messages.findFirst({
      where: eq(messages.waMessageId, inbound.waMessageId),
    });
    if (alreadyProcessed) {
      return NextResponse.json({ status: "duplicate" });
    }
  } catch (error) {
    console.error("Dedup pre-check failed, proceeding anyway:", error);
  }

  const clinic = await db.query.clinics.findFirst({
    where: eq(clinics.whatsappPhoneNumberId, inbound.phoneNumberId),
  });
  if (!clinic) {
    return new NextResponse("Unknown WhatsApp number", { status: 404 });
  }

  const phone = inbound.waId.startsWith("+") ? inbound.waId : `+${inbound.waId}`;

  let patient = await db.query.patients.findFirst({
    where: and(eq(patients.clinicId, clinic.id), eq(patients.phone, phone)),
  });
  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({ clinicId: clinic.id, phone, name: phone })
      .returning();
  }

  let conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.clinicId, clinic.id),
      eq(conversations.patientId, patient.id),
      eq(conversations.status, "active"),
    ),
  });
  if (!conversation) {
    [conversation] = await db
      .insert(conversations)
      .values({ clinicId: clinic.id, patientId: patient.id })
      .returning();
  }

  if (inbound.type !== "text") {
    await receivePaymentReceipt({
      clinicId: clinic.id,
      patientId: patient.id,
      conversationId: conversation.id,
      phoneNumberId: inbound.phoneNumberId,
      patientWaId: inbound.waId,
      mediaId: inbound.mediaId,
      waMessageId: inbound.waMessageId,
    });
    return NextResponse.json({ status: "ok" });
  }

  const replyText = await respondToPatientMessage({
    clinicId: clinic.id,
    clinicName: clinic.name,
    patientId: patient.id,
    conversationId: conversation.id,
    incomingText: inbound.text,
    waMessageId: inbound.waMessageId,
    phoneNumberId: inbound.phoneNumberId,
    patientWaId: inbound.waId,
  });

  // null means this waMessageId was already processed by a prior (retried) delivery.
  if (replyText === null) {
    return NextResponse.json({ status: "duplicate" });
  }

  await sendWhatsAppReply(inbound.phoneNumberId, inbound.waId, replyText);

  return NextResponse.json({ status: "ok" });
}
