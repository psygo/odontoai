"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { customers, paymentMethod, paymentReceipts, paymentStatus, payments } from "@/db/schema";

// Handles both create and edit — a single modal/form posts here, with an
// empty `paymentId` meaning "create a new one".
export async function savePaymentAction(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return "Sessão inválida. Faça login novamente.";
  }
  const clinicId = session.user.clinicId;

  const paymentIdRaw = formData.get("paymentId");
  const customerId = formData.get("customerId");
  const amount = formData.get("amount");
  const method = formData.get("method");
  const status = formData.get("status");
  const description = formData.get("description");
  const dueDate = formData.get("dueDate");

  if (
    typeof customerId !== "string" ||
    !customerId ||
    typeof amount !== "string" ||
    !amount ||
    typeof method !== "string" ||
    !paymentMethod.enumValues.includes(method as (typeof paymentMethod.enumValues)[number])
  ) {
    return "Preencha cliente, valor e método de pagamento.";
  }

  const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return "Valor inválido.";
  }

  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.clinicId, clinicId)),
  });
  if (!customer) {
    return "Cliente inválido.";
  }

  const paymentId = typeof paymentIdRaw === "string" && paymentIdRaw ? paymentIdRaw : null;
  const values = {
    clinicId,
    customerId,
    amountCents,
    method: method as (typeof paymentMethod.enumValues)[number],
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    dueDate: typeof dueDate === "string" && dueDate.trim() ? dueDate.trim() : null,
  };

  if (paymentId) {
    const statusValue =
      typeof status === "string" && paymentStatus.enumValues.includes(status as (typeof paymentStatus.enumValues)[number])
        ? (status as (typeof paymentStatus.enumValues)[number])
        : undefined;
    await db
      .update(payments)
      .set({ ...values, ...(statusValue ? { status: statusValue, ...(statusValue === "paid" ? { paidAt: new Date() } : {}) } : {}) })
      .where(and(eq(payments.id, paymentId), eq(payments.clinicId, clinicId)));
  } else {
    await db.insert(payments).values(values);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/customers/${customerId}`);
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payments");
}

// Links a receipt the WhatsApp agent couldn't unambiguously match on arrival
// (customer had zero or multiple pending payments) to the specific payment a
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
    .set({ paymentId })
    .where(and(eq(paymentReceipts.id, receiptId), eq(paymentReceipts.clinicId, clinicId)));

  revalidatePath("/dashboard/payments");
}
