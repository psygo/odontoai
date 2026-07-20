import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, conversations, dentists } from "@/db/schema";

export function createPatientTools(clinicId: string, patientId: string, conversationId: string) {
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

  return [listDentists, checkAvailability, bookAppointment, listMyAppointments, cancelAppointment, escalateToHuman];
}
