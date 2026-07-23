"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut, unstable_update } from "@/auth";
import { db } from "@/db";
import { clinicMemberships, clinics, users } from "@/db/schema";

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}

// Switches which business the current login is acting as. Silently no-ops on
// an invalid/foreign clinicId — this is the authorization gate that stops a
// user from switching into a business they don't belong to.
export async function switchBusinessAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const clinicId = formData.get("clinicId");
  if (typeof clinicId !== "string" || !clinicId) return;

  const membership = await db.query.clinicMemberships.findFirst({
    where: and(eq(clinicMemberships.userId, session.user.id), eq(clinicMemberships.clinicId, clinicId)),
  });
  if (!membership) return;

  await db.update(users).set({ lastActiveClinicId: clinicId }).where(eq(users.id, session.user.id));
  await unstable_update({ user: { clinicId: membership.clinicId, role: membership.role } });
  // A real redirect (not just revalidatePath) is what makes the browser's
  // next request actually carry the updated session cookie — revalidatePath
  // alone re-renders using the request's original (stale) cookie.
  redirect("/dashboard");
}

// Creates a brand-new business + an admin membership for the current user,
// then switches them into it.
export async function createBusinessAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return "Sessão inválida. Faça login novamente.";
  }

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return "Nome do negócio é obrigatório.";
  }

  const userId = session.user.id;
  const clinicId = await db.transaction(async (tx) => {
    const [clinic] = await tx.insert(clinics).values({ name: name.trim() }).returning();
    await tx.insert(clinicMemberships).values({ userId, clinicId: clinic.id, role: "admin" });
    await tx.update(users).set({ lastActiveClinicId: clinic.id }).where(eq(users.id, userId));
    return clinic.id;
  });

  await unstable_update({ user: { clinicId, role: "admin" } });
  redirect("/dashboard");
}
