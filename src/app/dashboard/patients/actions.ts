"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { patients } from "@/db/schema";

export async function createPatientAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }

  const name = formData.get("name");
  const phone = formData.get("phone");
  const cpf = formData.get("cpf");
  const birthDate = formData.get("birthDate");
  const email = formData.get("email");

  if (typeof name !== "string" || !name.trim() || typeof phone !== "string" || !phone.trim()) {
    return "Nome e telefone são obrigatórios.";
  }

  const normalizedPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;

  const existing = await db.query.patients.findFirst({
    where: and(eq(patients.clinicId, session.user.clinicId), eq(patients.phone, normalizedPhone)),
  });
  if (existing) {
    return "Já existe um paciente cadastrado com este telefone.";
  }

  await db.insert(patients).values({
    clinicId: session.user.clinicId,
    name: name.trim(),
    phone: normalizedPhone,
    cpf: typeof cpf === "string" && cpf.trim() ? cpf.trim() : null,
    birthDate: typeof birthDate === "string" && birthDate.trim() ? birthDate.trim() : null,
    email: typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null,
  });

  revalidatePath("/dashboard/patients");
}

export async function updatePatientAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }

  const patientId = formData.get("patientId");
  const name = formData.get("name");
  const phone = formData.get("phone");
  const cpf = formData.get("cpf");
  const birthDate = formData.get("birthDate");
  const email = formData.get("email");
  const notes = formData.get("notes");

  if (
    typeof patientId !== "string" ||
    !patientId ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof phone !== "string" ||
    !phone.trim()
  ) {
    return "Nome e telefone são obrigatórios.";
  }

  const normalizedPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;

  const existing = await db.query.patients.findFirst({
    where: and(eq(patients.clinicId, session.user.clinicId), eq(patients.phone, normalizedPhone)),
  });
  if (existing && existing.id !== patientId) {
    return "Já existe outro paciente cadastrado com este telefone.";
  }

  await db
    .update(patients)
    .set({
      name: name.trim(),
      phone: normalizedPhone,
      cpf: typeof cpf === "string" && cpf.trim() ? cpf.trim() : null,
      birthDate: typeof birthDate === "string" && birthDate.trim() ? birthDate.trim() : null,
      email: typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    })
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, session.user.clinicId)));

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/patients");
}
