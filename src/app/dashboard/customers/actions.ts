"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { customers } from "@/db/schema";

// Handles both create and edit — a single modal/form posts here, with an
// empty `customerId` meaning "create a new one".
export async function saveCustomerAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const customerIdRaw = formData.get("customerId");
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
  const customerId = typeof customerIdRaw === "string" && customerIdRaw ? customerIdRaw : null;

  const existing = await db.query.customers.findFirst({
    where: and(
      eq(customers.clinicId, clinicId),
      eq(customers.phone, normalizedPhone),
      customerId ? ne(customers.id, customerId) : undefined,
    ),
  });
  if (existing) {
    return "Já existe um cliente cadastrado com este telefone.";
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

  if (customerId) {
    await db.update(customers).set(values).where(and(eq(customers.id, customerId), eq(customers.clinicId, clinicId)));
  } else {
    await db.insert(customers).values(values);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  if (customerId) revalidatePath(`/dashboard/customers/${customerId}`);
}
