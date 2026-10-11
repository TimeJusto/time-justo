import { Check, Info, X } from "lucide-react";
import type { DrawValidation } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const REPETITION_TOOLTIP =
  "Cada dupla conta uma vez por baba anterior. O peso da dupla aumenta 1 a cada baba em que os dois jogaram juntos. O total soma os pesos de todas as duplas reunidas neste sorteio. Uma janela maior gera um número maior — o que é normal.";

interface ValidationPanelProps {
  validation: DrawValidation;
}

/** Item com aprovação (OK) ou falha — só para as validações obrigatórias. */
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

/** Item apenas informativo (sem julgamento de sucesso/falha). */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="shrink-0 text-sm font-semibold">{value}</span>
    </div>
  );
}

/**
 * Indicador neutro (âmbar): não é sucesso nem falha.
 * Usado para os pontos de repetição, que dependem da janela configurada.
 */
function IndicatorRow({
  label,
  value,
  detail,
  tooltip,
  className,
}: {
  label: string;
  value: number;
  detail: string;
  tooltip: string;
  className?: string;
}) {
  return (
    <div className={cn("py-2", className)}>
      <div className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
        <span>
          {label}: <span className="font-bold">{value}</span>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Como os pontos de repetição são calculados"
              className="text-amber-700/70 transition-colors hover:text-amber-900"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-xs text-amber-700">{detail}</div>
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
          label={`${validation.playersPerTeam} ${
            validation.playersPerTeam === 1 ? "jogador" : "jogadores"
          } por time`}
          detail={
            validation.playersPerTeamOk
              ? "Todos os times completos"
              : "Algum time incompleto"
          }
          ok={validation.playersPerTeamOk}
        />
        <StatusRow
          label="Goleiros distribuídos"
          detail="Máximo de 1 goleiro por time"
          ok={validation.goalkeepersDistributed}
        />
        <StatusRow
          label={`Diferença de estrelas ≤ ${validation.maxStarDifference}`}
          detail={`Diferença atual: ${validation.starDifferenceValue}`}
          ok={validation.starDifferenceOk}
        />
        <StatusRow
          label={`Diferença por posição ≤ ${validation.maxPositionDifference}`}
          detail="Em todas as posições"
          ok={validation.positionDifferenceOk}
        />
        <IndicatorRow
          label="Pontos de repetição"
          value={validation.repetitionScore}
          detail="Indicador — menor é melhor"
          tooltip={REPETITION_TOOLTIP}
          className="my-1 rounded-md bg-amber-50 px-3"
        />
        <InfoRow label="Tentativas" value={String(validation.attempts)} />
      </div>
    </div>
  );
}
