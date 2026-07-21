"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists, patients, prescriptions } from "@/db/schema";

export async function createPrescriptionAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const patientId = formData.get("patientId");
  const dentistId = formData.get("dentistId");
  const content = formData.get("content");

  if (
    typeof patientId !== "string" ||
    !patientId ||
    typeof dentistId !== "string" ||
    !dentistId ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return "Preencha paciente, dentista e o texto da receita.";
  }

  const [patient, dentist] = await Promise.all([
    db.query.patients.findFirst({ where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)) }),
    db.query.dentists.findFirst({ where: and(eq(dentists.id, dentistId), eq(dentists.clinicId, clinicId)) }),
  ]);
  if (!patient || !dentist) {
    return "Paciente ou dentista inválido.";
  }

  await db.insert(prescriptions).values({
    clinicId,
    patientId,
    dentistId,
    content: content.trim(),
  });

  revalidatePath("/dashboard/prescriptions");
  revalidatePath(`/dashboard/patients/${patientId}`);
}

// Signing is final: once signed, a prescription is immutable and becomes
// eligible for the WhatsApp agent to forward to the patient verbatim.
export async function signPrescriptionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) return;

  const prescriptionId = formData.get("prescriptionId");
  if (typeof prescriptionId !== "string" || !prescriptionId) return;

  const prescription = await db.query.prescriptions.findFirst({
    where: and(
      eq(prescriptions.id, prescriptionId),
      eq(prescriptions.clinicId, session.user.clinicId),
      eq(prescriptions.status, "draft"),
    ),
  });
  if (!prescription) return;

  await db
    .update(prescriptions)
    .set({ status: "signed", signedAt: new Date() })
    .where(eq(prescriptions.id, prescriptionId));

  revalidatePath("/dashboard/prescriptions");
  revalidatePath(`/dashboard/patients/${prescription.patientId}`);
}
