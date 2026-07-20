"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists } from "@/db/schema";

export async function createDentistAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }

  const name = formData.get("name");
  const email = formData.get("email");
  const croNumber = formData.get("croNumber");
  const croState = formData.get("croState");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof croNumber !== "string" ||
    !croNumber.trim() ||
    typeof croState !== "string" ||
    !croState.trim()
  ) {
    return "Preencha todos os campos.";
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.query.dentists.findFirst({ where: eq(dentists.email, normalizedEmail) });
  if (existing) {
    return "Já existe um dentista cadastrado com este e-mail.";
  }

  await db.insert(dentists).values({
    clinicId: session.user.clinicId,
    name: name.trim(),
    email: normalizedEmail,
    croNumber: croNumber.trim(),
    croState: croState.trim().toUpperCase(),
  });

  revalidatePath("/dashboard/dentists");
}

export async function updateDentistAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }

  const dentistId = formData.get("dentistId");
  const name = formData.get("name");
  const email = formData.get("email");
  const croNumber = formData.get("croNumber");
  const croState = formData.get("croState");

  if (
    typeof dentistId !== "string" ||
    !dentistId ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof croNumber !== "string" ||
    !croNumber.trim() ||
    typeof croState !== "string" ||
    !croState.trim()
  ) {
    return "Preencha todos os campos.";
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.query.dentists.findFirst({
    where: and(eq(dentists.email, normalizedEmail), ne(dentists.id, dentistId)),
  });
  if (existing) {
    return "Já existe outro dentista cadastrado com este e-mail.";
  }

  await db
    .update(dentists)
    .set({
      name: name.trim(),
      email: normalizedEmail,
      croNumber: croNumber.trim(),
      croState: croState.trim().toUpperCase(),
    })
    .where(and(eq(dentists.id, dentistId), eq(dentists.clinicId, session.user.clinicId)));

  revalidatePath(`/dashboard/dentists/${dentistId}`);
  revalidatePath("/dashboard/dentists");
}
