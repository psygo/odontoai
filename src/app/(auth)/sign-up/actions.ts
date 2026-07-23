"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/db";
import { clinicMemberships, clinics, users } from "@/db/schema";

export async function signUpAction(_prevState: string | undefined, formData: FormData) {
  const clinicName = formData.get("clinicName");
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof clinicName !== "string" ||
    !clinicName.trim() ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return "Preencha todos os campos. A senha deve ter ao menos 8 caracteres.";
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });
  if (existingUser) {
    return "Já existe uma conta com este e-mail.";
  }

  const passwordHash = await hash(password, 10);

  await db.transaction(async (tx) => {
    const [clinic] = await tx.insert(clinics).values({ name: clinicName.trim() }).returning();
    const [user] = await tx
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        lastActiveClinicId: clinic.id,
      })
      .returning();
    await tx.insert(clinicMemberships).values({ userId: user.id, clinicId: clinic.id, role: "admin" });
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Conta criada. Faça login para continuar.";
    }
    throw error;
  }
}
