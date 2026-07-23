import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { CustomerProfileClient } from "../customer-profile-client";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, id), eq(customers.clinicId, clinicId)),
    with: {
      payments: { orderBy: (p, { desc }) => [desc(p.createdAt)] },
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <CustomerProfileClient
      customer={{
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        cpf: customer.cpf,
        birthDate: customer.birthDate,
        email: customer.email,
        notes: customer.notes,
        sinceLabel: customer.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      }}
      payments={customer.payments.map((p) => ({
        id: p.id,
        amountCents: p.amountCents,
        method: p.method,
        status: p.status,
        description: p.description,
        dueDate: p.dueDate,
      }))}
    />
  );
}
