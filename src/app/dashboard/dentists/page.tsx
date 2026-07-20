import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { dentists } from "@/db/schema";
import { NewDentistForm } from "./new-dentist-form";

export default async function DentistsPage() {
  const session = await auth();
  const clinicId = session!.user.clinicId;

  const rows = await db.query.dentists.findMany({
    where: eq(dentists.clinicId, clinicId),
    orderBy: (d, { asc }) => [asc(d.name)],
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Equipe</h1>

      <NewDentistForm />

      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-black/10 text-black/60">
            <th className="py-2 pr-4 font-medium">Nome</th>
            <th className="py-2 pr-4 font-medium">E-mail</th>
            <th className="py-2 pr-4 font-medium">CRO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((dentist) => (
            <tr key={dentist.id} className="border-b border-black/5">
              <td className="py-2 pr-4">
                <Link href={`/dashboard/dentists/${dentist.id}`} className="underline">
                  {dentist.name}
                </Link>
              </td>
              <td className="py-2 pr-4">{dentist.email}</td>
              <td className="py-2 pr-4">
                {dentist.croNumber}/{dentist.croState}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-black/60">
                Nenhum dentista cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
