"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { clinics } from "@/db/schema";

export async function updatePixKeyAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }

  const pixKey = formData.get("pixKey");
  if (typeof pixKey !== "string") {
    return "Chave Pix inválida.";
  }

  await db
    .update(clinics)
    .set({ pixKey: pixKey.trim() || null })
    .where(eq(clinics.id, session.user.clinicId));

  revalidatePath("/dashboard/settings");
}
