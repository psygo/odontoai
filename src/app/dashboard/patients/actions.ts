"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { patients } from "@/db/schema";

// Handles both create and edit — a single modal/form posts here, with an
// empty `patientId` meaning "create a new one".
export async function savePatientAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const patientIdRaw = formData.get("patientId");
  const name = formData.get("name");
  const phone = formData.get("phone");
  const cpf = formData.get("cpf");
  const birthDate = formData.get("birthDate");
  const email = formData.get("email");
  const notes = formData.get("notes");

  if (typeof name !== "string" || !name.trim() || typeof phone !== "string" || !phone.trim()) {
    return "Nome e telefone são obrigatórios.";
  }

  const normalizedPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
  const patientId = typeof patientIdRaw === "string" && patientIdRaw ? patientIdRaw : null;

  const existing = await db.query.patients.findFirst({
    where: and(
      eq(patients.clinicId, clinicId),
      eq(patients.phone, normalizedPhone),
      patientId ? ne(patients.id, patientId) : undefined,
    ),
  });
  if (existing) {
    return "Já existe um paciente cadastrado com este telefone.";
  }

  const values = {
    clinicId,
    name: name.trim(),
    phone: normalizedPhone,
    cpf: typeof cpf === "string" && cpf.trim() ? cpf.trim() : null,
    birthDate: typeof birthDate === "string" && birthDate.trim() ? birthDate.trim() : null,
    email: typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  };

  if (patientId) {
    await db.update(patients).set(values).where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)));
  } else {
    await db.insert(patients).values(values);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/patients");
  if (patientId) revalidatePath(`/dashboard/patients/${patientId}`);
}
