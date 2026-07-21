import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, clinics, patients } from "@/db/schema";

async function main() {
  const conversation = await db.query.conversations.findFirst({
    orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
  });

  if (!conversation) {
    console.log("No conversations found.");
    return;
  }

  const patient = await db.query.patients.findFirst({ where: eq(patients.id, conversation.patientId) });
  const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, conversation.clinicId) });

  console.log("Conversation:", conversation.id, "| status:", conversation.status);
  console.log("Patient:", patient?.name, patient?.phone);
  console.log("Clinic:", clinic?.name, clinic?.id);

  const history = await db.query.messages.findMany({
    where: (m, { eq }) => eq(m.conversationId, conversation.id),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  for (const m of history) {
    console.log(`\n--- ${m.role} (${m.createdAt.toISOString()}) waMessageId=${m.waMessageId ?? "n/a"} ---`);
    console.log(JSON.stringify(m.content, null, 2));
  }

  const appts = await db.query.appointments.findMany({ where: eq(appointments.patientId, conversation.patientId) });
  console.log(`\n--- Appointments for this patient (${appts.length}) ---`);
  console.log(JSON.stringify(appts, null, 2));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
