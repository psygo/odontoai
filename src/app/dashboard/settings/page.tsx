import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { PixKeyForm } from "./pix-key-form";

export default async function SettingsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <PixKeyForm pixKey={clinic?.pixKey ?? null} />
    </div>
  );
}
