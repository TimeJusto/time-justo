import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { sortPlayers } from "@/lib/normalize";
import { formatStars } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 text-center",
        className,
      )}
    >
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function ElencoDoDia() {
  const { players, settings } = useApp();

  const confirmed = useMemo(
    () => sortPlayers(players.filter((p) => p.confirmed)),
    [players],
  );
  const meta = settings.numberOfTeams * settings.playersPerTeam;
  const totalStars = confirmed.reduce((sum, p) => sum + p.stars, 0);

  const countByPosition = (pos: string) =>
    confirmed.filter((p) => p.position === pos).length;

  const delta = confirmed.length - meta;
  const situacao =
    delta === 0
      ? { label: "PRONTO", tone: "success", icon: CheckCircle2 }
      : delta < 0
        ? { label: `FALTAM ${-delta}`, tone: "warning", icon: AlertTriangle }
        : { label: `EXCEDENTE ${delta}`, tone: "danger", icon: Info };

  const toneClasses: Record<string, string> = {
    success: "bg-success-light text-success",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-destructive/10 text-destructive",
  };
  const SituacaoIcon = situacao.icon;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Elenco do Dia</h2>
        <p className="text-sm text-muted-foreground">
          Somente jogadores confirmados no cadastro.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
            toneClasses[situacao.tone],
          )}
        >
          <SituacaoIcon className="h-4 w-4" />
          {situacao.label}
        </span>
        <span className="text-sm text-muted-foreground">
          Meta: {meta} jogadores ({settings.numberOfTeams} times ×{" "}
          {settings.playersPerTeam} por time)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <SummaryCard label="Total" value={confirmed.length} />
        <SummaryCard label="Goleiros" value={countByPosition("Goleiro")} />
        <SummaryCard label="Zagueiros" value={countByPosition("Zagueiro")} />
        <SummaryCard label="Meias" value={countByPosition("Meia")} />
        <SummaryCard label="Atacantes" value={countByPosition("Atacante")} />
        <SummaryCard label="Estrelas" value={totalStars} />
        <SummaryCard
          label="Situação"
          value={situacao.label}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead>Estrelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmed.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum jogador confirmado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                confirmed.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.position}</TableCell>
                    <TableCell>{formatStars(p.stars)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
