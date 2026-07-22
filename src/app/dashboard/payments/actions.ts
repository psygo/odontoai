"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { paymentMethod, paymentReceipts, payments, patients } from "@/db/schema";

export async function createPaymentAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const patientId = formData.get("patientId");
  const amount = formData.get("amount");
  const method = formData.get("method");
  const description = formData.get("description");
  const dueDate = formData.get("dueDate");

  if (
    typeof patientId !== "string" ||
    !patientId ||
    typeof amount !== "string" ||
    !amount ||
    typeof method !== "string" ||
    !paymentMethod.enumValues.includes(method as (typeof paymentMethod.enumValues)[number])
  ) {
    return "Preencha paciente, valor e método de pagamento.";
  }

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return "Valor inválido.";
  }

  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)),
  });
  if (!patient) {
    return "Paciente inválido.";
  }

  await db.insert(payments).values({
    clinicId,
    patientId,
    amountCents,
    method: method as (typeof paymentMethod.enumValues)[number],
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    dueDate: typeof dueDate === "string" && dueDate.trim() ? dueDate.trim() : null,
  });

  revalidatePath("/dashboard/payments");
}

export async function markPaymentPaidAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) return;

  const paymentId = formData.get("paymentId");
  if (typeof paymentId !== "string" || !paymentId) return;

  await db
    .update(payments)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(payments.id, paymentId), eq(payments.clinicId, session.user.clinicId)));

  revalidatePath("/dashboard/payments");
}

// Links a receipt the WhatsApp agent couldn't unambiguously match on arrival
// (patient had zero or multiple pending payments) to the specific payment a
// staff member identifies by hand. This never marks the payment as paid by
// itself — staff still confirms that separately via markPaymentPaidAction.
export async function linkReceiptToPaymentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) return;
  const clinicId = session.user.clinicId;

  const receiptId = formData.get("receiptId");
  const paymentId = formData.get("paymentId");
  if (typeof receiptId !== "string" || !receiptId || typeof paymentId !== "string" || !paymentId) return;

  const payment = await db.query.payments.findFirst({
    where: and(eq(payments.id, paymentId), eq(payments.clinicId, clinicId)),
  });
  if (!payment) return;

  await db
    .update(paymentReceipts)
    .set({ paymentId, appointmentId: payment.appointmentId })
    .where(and(eq(paymentReceipts.id, receiptId), eq(paymentReceipts.clinicId, clinicId)));

  revalidatePath("/dashboard/payments");
}
