import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { customers, payments } from "@/db/schema";
import { CustomersPageClient, type CustomerRow } from "./customers-page-client";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: newFlag } = await searchParams;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const [customerRows, paymentRows] = await Promise.all([
    db.query.customers.findMany({ where: eq(customers.clinicId, clinicId), orderBy: (c, { asc }) => [asc(c.name)] }),
    db.query.payments.findMany({
      where: eq(payments.clinicId, clinicId),
      columns: { customerId: true, createdAt: true },
    }),
  ]);

  const paymentsByCustomer = new Map<string, Date[]>();
  for (const payment of paymentRows) {
    const list = paymentsByCustomer.get(payment.customerId) ?? [];
    list.push(payment.createdAt);
    paymentsByCustomer.set(payment.customerId, list);
  }

  const rows: CustomerRow[] = customerRows.map((c) => {
    const dates = paymentsByCustomer.get(c.id) ?? [];
    const lastPayment = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      paymentCount: dates.length,
      lastPaymentLabel: lastPayment ? lastPayment.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—",
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-strong">Clientes</h1>
      <CustomersPageClient customers={rows} openCreate={newFlag === "1"} />
    </div>
  );
}
