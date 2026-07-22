import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists } from "@/db/schema";
import { EditDentistForm } from "../edit-dentist-form";

export default async function DentistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const dentist = await db.query.dentists.findFirst({
    where: and(eq(dentists.id, id), eq(dentists.clinicId, clinicId)),
  });

  if (!dentist) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-strong">{dentist.name}</h1>
      <EditDentistForm dentist={dentist} />
    </div>
  );
}
