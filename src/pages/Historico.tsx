import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, ChevronDown, Trash2 } from "lucide-react";
import type { Draw } from "@/types";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamCard } from "@/components/team-card";
import { ConfirmDialog } from "@/components/confirm-dialog";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function Historico() {
  const { history, settings, removeBaba } = useApp();
  const [numberFilter, setNumberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Draw | null>(null);

  const lastBaba = history[history.length - 1];

  const filtered = useMemo(() => {
    const filteredHistory = history.filter((d) => {
      if (numberFilter.trim() && String(d.babaNumber) !== numberFilter.trim()) {
        return false;
      }
      if (dateFilter.trim() && d.date !== dateFilter.trim()) {
        return false;
      }
      return true;
    });
    return [...filteredHistory].reverse(); // mais recente primeiro
  }, [history, numberFilter, dateFilter]);

  const handleDelete = () => {
    if (!deleting) return;
    removeBaba(deleting.id);
    if (expandedId === deleting.id) setExpandedId(null);
    toast.success(`Baba ${deleting.babaNumber} excluído do Histórico.`);
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Histórico</h2>
        <p className="text-sm text-muted-foreground">
          Babas salvos com seus times completos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Babas salvos" value={history.length} />
        <StatCard label="Data do último baba" value={lastBaba?.date ?? "—"} />
        <StatCard
          label="Janela usada"
          value={lastBaba ? `${lastBaba.historyWindow} baba(s)` : `${settings.historyWindow} baba(s)`}
        />
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          Nenhum baba salvo ainda. Faça um sorteio e clique em SALVAR BABA.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filtrar por data (dd/mm/aaaa)"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Input
              type="number"
              min={1}
              placeholder="Filtrar por número do baba"
              value={numberFilter}
              onChange={(e) => setNumberFilter(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">
                Nenhum baba encontrado com os filtros informados.
              </div>
            ) : (
              filtered.map((draw) => {
                const open = expandedId === draw.id;
                return (
                  <div key={draw.id} className="overflow-hidden rounded-xl border bg-card">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      onClick={() => setExpandedId(open ? null : draw.id)}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {draw.babaNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-foreground">
                          Baba {draw.babaNumber}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {draw.date} · {draw.teams.length} times ·{" "}
                          {draw.repetitionScore} ponto(s) de repetição ·{" "}
                          {draw.attempts} tentativas
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </button>

                    {open ? (
                      <div className="border-t border-border p-4">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          {draw.teams.map((team) => (
                            <TeamCard key={team.teamNumber} team={team} compact />
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(draw)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir baba
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir baba do Histórico?"
        description={
          deleting
            ? `O Baba ${deleting.babaNumber} (${deleting.date}) será removido permanentemente.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
