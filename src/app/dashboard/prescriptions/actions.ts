"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists, patients, prescriptions } from "@/db/schema";

// Handles both create and edit — a single modal/form posts here, with an
// empty `prescriptionId` meaning "create a new one". Editing is only ever
// allowed while status is still "draft" — enforced server-side here too
// (not just hidden client-side), since signing is meant to be final.
export async function savePrescriptionAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const prescriptionIdRaw = formData.get("prescriptionId");
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

  const prescriptionId = typeof prescriptionIdRaw === "string" && prescriptionIdRaw ? prescriptionIdRaw : null;

  if (prescriptionId) {
    const updated = await db
      .update(prescriptions)
      .set({ patientId, dentistId, content: content.trim() })
      .where(and(eq(prescriptions.id, prescriptionId), eq(prescriptions.clinicId, clinicId), eq(prescriptions.status, "draft")))
      .returning({ id: prescriptions.id });
    if (updated.length === 0) {
      return "Essa receita já foi assinada e não pode mais ser editada.";
    }
  } else {
    await db.insert(prescriptions).values({ clinicId, patientId, dentistId, content: content.trim() });
  }

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
