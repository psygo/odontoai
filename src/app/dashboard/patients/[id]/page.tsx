export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Detalhes do paciente</h1>
      <p className="text-sm text-black/60 dark:text-white/60">Paciente: {id}</p>
    </div>
  );
}
