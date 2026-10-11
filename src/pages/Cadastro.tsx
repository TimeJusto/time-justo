import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useApp, type PlayerInput } from "@/context/AppContext";
import type { Player, Position } from "@/types";
import { POSITIONS, removeAccents } from "@/lib/normalize";
import { starOptions } from "@/lib/scale";
import { formatStars } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayerDialog } from "@/components/player-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-bold ${
          highlight ? "text-success" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function Cadastro() {
  const {
    players,
    settings,
    labels,
    addPlayer,
    updatePlayer,
    deletePlayer,
    toggleConfirmed,
    updateList,
  } = useApp();

  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<"all" | Position>("all");
  const [confirmFilter, setConfirmFilter] = useState<
    "all" | "confirmed" | "unconfirmed"
  >("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);

  const filtered = useMemo(() => {
    const query = removeAccents(search.trim().toLowerCase());
    return players.filter((p) => {
      if (query && !removeAccents(p.name.toLowerCase()).includes(query)) {
        return false;
      }
      if (positionFilter !== "all" && p.position !== positionFilter) {
        return false;
      }
      if (confirmFilter === "confirmed" && !p.confirmed) return false;
      if (confirmFilter === "unconfirmed" && p.confirmed) return false;
      return true;
    });
  }, [players, search, positionFilter, confirmFilter]);

  const confirmed = players.filter((p) => p.confirmed);
  const meta = settings.numberOfTeams * settings.playersPerTeam;
  const missing = Math.max(0, meta - confirmed.length);
  const countByPosition = (pos: Position) =>
    confirmed.filter((p) => p.position === pos).length;
  const countByStars = (n: number) =>
    confirmed.filter((p) => p.stars === n).length;

  const handleSave = (input: PlayerInput): string | null => {
    if (editing) return updatePlayer(editing.id, input);
    return addPlayer(input);
  };

  const handleUpdateList = () => {
    const { success, messages } = updateList();
    if (success) {
      messages.forEach((m) => toast.success(m));
    } else {
      messages.forEach((m) => toast.warning(m));
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    deletePlayer(deleting.id);
    toast.success(`${deleting.name} removido do Cadastro.`);
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cadastro</h2>
          <p className="text-sm text-muted-foreground">
            Elenco completo com posição, estrelas e confirmação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar jogador
          </Button>
          <Button variant="secondary" onClick={handleUpdateList}>
            <RefreshCw className="h-4 w-4" />
            ATUALIZAR LISTA
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={positionFilter}
          onValueChange={(v) => setPositionFilter(v as "all" | Position)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Posição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as posições</SelectItem>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={confirmFilter}
          onValueChange={(v) =>
            setConfirmFilter(v as "all" | "confirmed" | "unconfirmed")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Confirmação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="unconfirmed">Não confirmados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border bg-card">
          {/* Tabela no desktop */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Estrelas</TableHead>
                  <TableHead className="text-center">Confirmado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum jogador encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.position}</TableCell>
                      <TableCell>{formatStars(p.stars)}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={p.confirmed}
                          onCheckedChange={() => toggleConfirmed(p.id)}
                          aria-label={`Confirmar ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${p.name}`}
                            onClick={() => {
                              setEditing(p);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir ${p.name}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Lista em cards no mobile */}
          <ul className="divide-y divide-border md:hidden">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nenhum jogador encontrado.
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.position} · {formatStars(p.stars)}
                    </div>
                  </div>
                  <Switch
                    checked={p.confirmed}
                    onCheckedChange={() => toggleConfirmed(p.id)}
                    aria-label={`Confirmar ${p.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => {
                      setEditing(p);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${p.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">
              Resumo
            </h3>
            <div className="divide-y divide-border">
              <SummaryRow label="Confirmados" value={confirmed.length} highlight />
              <SummaryRow label="Meta atual" value={meta} />
              <SummaryRow label="Faltam" value={missing} />
              <SummaryRow label="Goleiros" value={countByPosition("Goleiro")} />
              <SummaryRow label="Zagueiros" value={countByPosition("Zagueiro")} />
              <SummaryRow label="Meias" value={countByPosition("Meia")} />
              <SummaryRow label="Atacantes" value={countByPosition("Atacante")} />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">
              Notas dos confirmados (1 a {settings.starScale})
            </h3>
            <div className="divide-y divide-border">
              {starOptions(settings.starScale).map((n) => (
                <SummaryRow
                  key={n}
                  label={formatStars(n)}
                  value={countByStars(n)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-success-light p-4 text-sm text-success">
            <p className="font-semibold">Fluxo de uso</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs">
              <li>Marque SIM nos confirmados</li>
              <li>Clique ATUALIZAR LISTA</li>
              <li>Confira o elenco do dia</li>
              <li>Clique SORTEAR em Times</li>
              <li>Após confirmar, clique {labels.saveButton}</li>
            </ol>
          </div>
        </aside>
      </div>

      <PlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir jogador"
        description={
          deleting
            ? `Tem certeza que deseja excluir ${deleting.name} do cadastro?`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
