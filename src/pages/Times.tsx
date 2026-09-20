import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Shuffle, Save, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { DrawDiagnostics } from "@/types";
import { buildValidation } from "@/algorithm/drawAlgorithm";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/team-card";
import { ValidationPanel } from "@/components/validation-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";

function DiagnosticItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function Times() {
  const { currentDraw, settings, runDraw, saveBaba } = useApp();
  const [saveOpen, setSaveOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DrawDiagnostics | null>(null);

  const validation = useMemo(
    () =>
      currentDraw
        ? buildValidation(
            currentDraw.teams,
            settings,
            currentDraw.repetitionScore,
            currentDraw.attempts,
          )
        : null,
    [currentDraw, settings],
  );

  const handleDraw = () => {
    const result = runDraw();
    if (!result.valid) {
      if (result.error) toast.error(result.error);
      setDiagnostics(result.diagnostics ?? null);
      return;
    }
    setDiagnostics(null);
    toast.success("Sorteio concluído e validado!");
  };

  const handleSaveConfirm = () => {
    const saved = saveBaba();
    setSaveOpen(false);
    if (saved) {
      toast.success(`Baba ${saved.babaNumber} salvo no Histórico.`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Times</h2>
        <p className="text-sm text-muted-foreground">
          Sorteio equilibrado por estrelas e posições, com menor repetição.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={handleDraw} className="text-base">
          <Shuffle className="h-5 w-5" />
          SORTEAR TIMES
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setSaveOpen(true)}
          disabled={!currentDraw}
          className="border-success/40 text-success hover:bg-success-light"
        >
          <Save className="h-5 w-5" />
          SALVAR BABA
        </Button>
        {currentDraw?.babaNumber != null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            Baba {currentDraw.babaNumber} salvo no Histórico
          </span>
        ) : null}
      </div>

      {diagnostics ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Não foi possível encontrar uma combinação válida
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <DiagnosticItem label="Times" value={diagnostics.teams} />
            <DiagnosticItem label="Jogadores" value={diagnostics.players} />
            <DiagnosticItem label="Goleiros" value={diagnostics.goalkeepers} />
            <DiagnosticItem label="Zagueiros" value={diagnostics.defenders} />
            <DiagnosticItem label="Meias" value={diagnostics.midfielders} />
            <DiagnosticItem label="Atacantes" value={diagnostics.attackers} />
            <DiagnosticItem label="Total de estrelas" value={diagnostics.totalStars} />
            <DiagnosticItem
              label="Intervalo de estrelas desejado"
              value={diagnostics.targetStarRange}
            />
            <DiagnosticItem label="Número de tentativas" value={diagnostics.attempts} />
          </div>
        </div>
      ) : null}

      {currentDraw ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {currentDraw.teams.map((team) => (
              <TeamCard key={team.teamNumber} team={team} />
            ))}
          </div>
          {validation ? (
            <div className="h-fit">
              <ValidationPanel validation={validation} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          Nenhum sorteio realizado ainda. Clique em SORTEAR TIMES.
        </div>
      )}

      <ConfirmDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Salvar este sorteio como o baba definitivo?"
        description="O sorteio será registrado no Histórico com o número sequencial do baba e a data de hoje."
        confirmLabel="Salvar baba"
        onConfirm={handleSaveConfirm}
      />
    </div>
  );
}
