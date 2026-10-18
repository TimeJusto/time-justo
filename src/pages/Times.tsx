import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Shuffle, Save, MessageCircle, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { DrawDiagnostics } from "@/types";
import { buildValidation } from "@/algorithm/drawAlgorithm";
import { formatDateBR } from "@/lib/format";
import { sortTeamsByNumber, teamCardKey } from "@/lib/normalize";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/team-card";
import { ValidationPanel } from "@/components/validation-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ShareDialog } from "@/components/share-dialog";

function DiagnosticItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default function Times() {
  const { currentDraw, effectiveSettings, labels, runDraw, saveBaba } = useApp();
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DrawDiagnostics | null>(null);

  const validation = useMemo(
    () =>
      currentDraw
        ? buildValidation(
            currentDraw.teams,
            effectiveSettings,
            currentDraw.repetitionScore,
            currentDraw.attempts,
          )
        : null,
    [currentDraw, effectiveSettings],
  );

  // Ordem fixa: Time 1, 2, 3... independente da ordem sorteada.
  const teams = useMemo(
    () => sortTeamsByNumber(currentDraw?.teams ?? []),
    [currentDraw],
  );

  // O compartilhamento só aparece com um sorteio válido (todos os times completos).
  const canShare = Boolean(
    currentDraw && teams.length > 0 && validation?.playersPerTeamOk,
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
      toast.success(labels.savedToast(saved.babaNumber));
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
          {labels.saveButton}
        </Button>
        {canShare ? (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShareOpen(true)}
          >
            <MessageCircle className="h-5 w-5" />
            COMPARTILHAR NO WHATSAPP
          </Button>
        ) : null}
        {currentDraw?.babaNumber != null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            {labels.savedBadge(currentDraw.babaNumber)}
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
            {teams.map((team) => (
              <TeamCard key={teamCardKey(team)} team={team} />
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
        title={labels.saveConfirmTitle}
        description={labels.saveConfirmDescription}
        confirmLabel={labels.saveConfirmLabel}
        onConfirm={handleSaveConfirm}
      />

      {canShare ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          teams={teams}
          dateLabel={currentDraw?.date ?? formatDateBR(new Date())}
        />
      ) : null}
    </div>
  );
}
