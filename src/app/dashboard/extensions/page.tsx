import { PuzzleIcon } from "../_components/icons";

export default function ExtensionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-ink-strong">Extensões</h1>

      <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-background px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-bg text-ink-faint">
          <PuzzleIcon className="h-6 w-6" />
        </div>
        <div className="text-sm font-semibold text-ink-strong">Nenhuma extensão instalada ainda</div>
        <p className="max-w-md text-sm text-ink-muted">
          Extensões adicionam funcionalidades específicas a este negócio — por exemplo, uma extensão de clínica
          odontológica adicionaria agenda, prontuário e receitas. Em breve você poderá instalar extensões por aqui.
        </p>
      </div>
    </div>
  );
}
