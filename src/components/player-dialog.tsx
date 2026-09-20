import { useEffect, useState } from "react";
import type { Player, Position } from "@/types";
import { POSITIONS } from "@/lib/normalize";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jogador em edição (null = novo jogador). */
  initial: Player | null;
  onSave: (input: {
    name: string;
    position: Position;
    stars: number;
    confirmed: boolean;
  }) => string | null;
}

export function PlayerDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: PlayerDialogProps) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("Meia");
  const [stars, setStars] = useState("3");
  const [confirmed, setConfirmed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPosition(initial?.position ?? "Meia");
      setStars(String(initial?.stars ?? 3));
      setConfirmed(initial?.confirmed ?? true);
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = () => {
    const result = onSave({
      name,
      position,
      stars: Number(stars),
      confirmed,
    });
    if (result !== null) {
      setError(result);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar jogador" : "Adicionar jogador"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do jogador para {initial ? "atualizar" : "incluir no"} cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="player-name">Nome</Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do jogador"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="player-position">Posição</Label>
              <Select
                value={position}
                onValueChange={(v) => setPosition(v as Position)}
              >
                <SelectTrigger id="player-position">
                  <SelectValue placeholder="Posição" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="player-stars">Estrelas (1 a 5)</Label>
              <Select value={stars} onValueChange={setStars}>
                <SelectTrigger id="player-stars">
                  <SelectValue placeholder="Estrelas" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} ★
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="player-confirmed">Confirmado no elenco do dia</Label>
            <Switch
              id="player-confirmed"
              checked={confirmed}
              onCheckedChange={setConfirmed}
            />
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {initial ? "Salvar alterações" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
