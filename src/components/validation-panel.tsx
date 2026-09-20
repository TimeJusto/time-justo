import { Check, X } from "lucide-react";
import type { DrawValidation } from "@/types";
import { cn } from "@/lib/utils";

interface ValidationPanelProps {
  validation: DrawValidation;
}

function StatusRow({
  label,
  detail,
  ok,
}: {
  label: string;
  detail: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
          ok ? "text-success" : "text-destructive",
        )}
      >
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {ok ? "OK" : "FALHA"}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="shrink-0 text-sm font-semibold">{value}</span>
    </div>
  );
}

/** Painel VALIDAÇÃO da tela Times. */
export function ValidationPanel({ validation }: ValidationPanelProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-foreground">
        Validação
      </h2>
      <div className="divide-y divide-border">
        <InfoRow label="Times" value={String(validation.teams)} />
        <StatusRow
          label={`${validation.playersPerTeam} jogadores por time`}
          detail={
            validation.sevenPerTeam
              ? "Todos os times completos"
              : "Algum time incompleto"
          }
          ok={validation.sevenPerTeam}
        />
        <StatusRow
          label="Goleiros distribuídos"
          detail="Máximo de 1 goleiro por time"
          ok={validation.goalkeepersDistributed}
        />
        <StatusRow
          label="Diferença de estrelas ≤ 1"
          detail={`Diferença atual: ${validation.starDifferenceValue}`}
          ok={validation.starDifferenceOk}
        />
        <StatusRow
          label="Diferença por posição ≤ 1"
          detail="Em todas as posições"
          ok={validation.positionDifferenceOk}
        />
        <StatusRow
          label="Pontos de repetição"
          detail={`Score de repetição: ${validation.repetitionScore}`}
          ok={validation.repetitionScore === 0}
        />
        <InfoRow label="Tentativas" value={String(validation.attempts)} />
      </div>
    </div>
  );
}
