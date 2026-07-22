import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, clinics, conversations, dentists, prescriptions } from "@/db/schema";
import { sendWhatsAppReply } from "@/lib/whatsapp";

interface WhatsAppContext {
  phoneNumberId: string;
  patientWaId: string;
}

export function createPatientTools(
  clinicId: string,
  patientId: string,
  conversationId: string,
  whatsapp: WhatsAppContext,
) {
  const listDentists = betaZodTool({
    name: "list_dentists",
    description:
      "List the dentists at this clinic, with their IDs. Use this to find a dentistId before checking availability or booking.",
    inputSchema: z.object({}),
    run: async () => {
      const rows = await db.query.dentists.findMany({
        where: eq(dentists.clinicId, clinicId),
        columns: { id: true, name: true },
      });
      return JSON.stringify(rows);
    },
  });

  const checkAvailability = betaZodTool({
    name: "check_availability",
    description:
      "Get existing (busy) appointments for a dentist on a given date, so you can find a free slot within the clinic's operating hours.",
    inputSchema: z.object({
      dentistId: z.string().describe("Dentist ID from list_dentists"),
      date: z.string().describe("Date in YYYY-MM-DD format"),
    }),
    run: async ({ dentistId, date }) => {
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59`);
      const rows = await db.query.appointments.findMany({
        where: and(
          eq(appointments.dentistId, dentistId),
          gte(appointments.startsAt, dayStart),
          lte(appointments.startsAt, dayEnd),
          ne(appointments.status, "cancelled"),
        ),
        columns: { startsAt: true, endsAt: true },
      });
      return JSON.stringify(rows);
    },
  });

  const bookAppointment = betaZodTool({
    name: "book_appointment",
    description:
      "Book a new appointment for the current patient. Only call this after the patient has confirmed a specific date and time.",
    inputSchema: z.object({
      dentistId: z.string(),
      startsAt: z.string().describe("ISO 8601 datetime"),
      endsAt: z.string().describe("ISO 8601 datetime"),
      notes: z.string().optional(),
    }),
    run: async ({ dentistId, startsAt, endsAt, notes }) => {
      const start = new Date(startsAt);
      const end = new Date(endsAt);

      const conflict = await db.query.appointments.findFirst({
        where: and(
          eq(appointments.dentistId, dentistId),
          ne(appointments.status, "cancelled"),
          lte(appointments.startsAt, end),
          gte(appointments.endsAt, start),
        ),
      });
      if (conflict) {
        return JSON.stringify({
          ok: false,
          error: "That slot is no longer available. Offer the patient a different time.",
        });
      }

      const [created] = await db
        .insert(appointments)
        .values({ clinicId, patientId, dentistId, startsAt: start, endsAt: end, notes, status: "scheduled" })
        .returning({ id: appointments.id });

      return JSON.stringify({ ok: true, appointmentId: created.id });
    },
  });

  const listMyAppointments = betaZodTool({
    name: "list_my_appointments",
    description: "List the current patient's upcoming appointments.",
    inputSchema: z.object({}),
    run: async () => {
      const rows = await db.query.appointments.findMany({
        where: and(
          eq(appointments.patientId, patientId),
          gte(appointments.startsAt, new Date()),
          ne(appointments.status, "cancelled"),
        ),
        columns: { id: true, startsAt: true, endsAt: true, status: true },
      });
      return JSON.stringify(rows);
    },
  });

  const cancelAppointment = betaZodTool({
    name: "cancel_appointment",
    description: "Cancel one of the current patient's own appointments.",
    inputSchema: z.object({ appointmentId: z.string() }),
    run: async ({ appointmentId }) => {
      const appt = await db.query.appointments.findFirst({
        where: and(eq(appointments.id, appointmentId), eq(appointments.patientId, patientId)),
      });
      if (!appt) {
        return JSON.stringify({ ok: false, error: "Appointment not found for this patient." });
      }
      await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, appointmentId));
      return JSON.stringify({ ok: true });
    },
  });

  const escalateToHuman = betaZodTool({
    name: "escalate_to_human",
    description:
      "Flag this conversation for clinic staff to follow up personally. Use for anything resembling a dental emergency, pain, medication questions, complaints, or anything outside scheduling/basic FAQ.",
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

  const listPrescriptions = betaZodTool({
    name: "list_prescriptions",
    description:
      "List the current patient's signed prescriptions (id, date, dentist name only — never the medication content). Use this before send_prescription when the patient asks for a receita, to check how many exist and, if there's more than one, ask which one they mean.",
    inputSchema: z.object({}),
    run: async () => {
      const rows = await db.query.prescriptions.findMany({
        where: and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, "signed")),
        with: { dentist: { columns: { name: true } } },
        columns: { id: true, signedAt: true },
        orderBy: (p, { desc }) => [desc(p.signedAt)],
      });
      return JSON.stringify(
        rows.map((row) => ({ id: row.id, signedAt: row.signedAt, dentistName: row.dentist.name })),
      );
    },
  });

  // The prescription text is sent directly here, out of band from the model's
  // own reply — the model never receives the content, so it can never
  // paraphrase, summarize, or alter a signed prescription before it reaches
  // the patient. It only learns whether the send succeeded.
  const sendPrescription = betaZodTool({
    name: "send_prescription",
    description:
      "Send a signed prescription to the patient on WhatsApp, exactly as the dentist wrote it. Requires a prescriptionId from list_prescriptions. If the patient only has one signed prescription, you may call this directly without asking which one.",
    inputSchema: z.object({ prescriptionId: z.string() }),
    run: async ({ prescriptionId }) => {
      const prescription = await db.query.prescriptions.findFirst({
        where: and(
          eq(prescriptions.id, prescriptionId),
          eq(prescriptions.patientId, patientId),
          eq(prescriptions.clinicId, clinicId),
          eq(prescriptions.status, "signed"),
        ),
      });
      if (!prescription) {
        return JSON.stringify({ ok: false, error: "Prescription not found or not signed yet." });
      }

      try {
        await sendWhatsAppReply(whatsapp.phoneNumberId, whatsapp.patientWaId, prescription.content);
      } catch (error) {
        console.error("send_prescription: WhatsApp dispatch failed:", error);
        return JSON.stringify({ ok: false, error: "WhatsApp send failed, ask the patient to try again shortly." });
      }

      await db
        .update(prescriptions)
        .set({ sentAt: prescription.sentAt ?? new Date() })
        .where(eq(prescriptions.id, prescriptionId));

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
      "Send the clinic's Pix key directly to the patient on WhatsApp, so they can pay. Use when the patient asks how to pay or asks for the Pix key/QR.",
    inputSchema: z.object({}),
    run: async () => {
      const clinic = await db.query.clinics.findFirst({
        where: eq(clinics.id, clinicId),
        columns: { pixKey: true },
      });
      if (!clinic?.pixKey) {
        return JSON.stringify({ ok: false, error: "This clinic has no Pix key configured yet." });
      }

      try {
        await sendWhatsAppReply(whatsapp.phoneNumberId, whatsapp.patientWaId, clinic.pixKey);
      } catch (error) {
        console.error("share_pix_key: WhatsApp dispatch failed:", error);
        return JSON.stringify({ ok: false, error: "WhatsApp send failed, ask the patient to try again shortly." });
      }

      return JSON.stringify({ ok: true });
    },
  });

  return [
    listDentists,
    checkAvailability,
    bookAppointment,
    listMyAppointments,
    cancelAppointment,
    escalateToHuman,
    listPrescriptions,
    sendPrescription,
    sharePixKey,
  ];
}
