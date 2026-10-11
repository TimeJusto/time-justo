import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, RotateCcw, Save, X } from "lucide-react";
import type { Settings } from "@/types";
import { useApp } from "@/context/AppContext";
import {
  DEFAULT_GAME_TERM,
  GAME_TERMS,
  getLabels,
  isGameTerm,
  type GameTerm,
} from "@/lib/labels";
import {
  APP_LOGO,
  DEFAULT_GROUP_NAME,
  GROUP_NAME_MAX_LENGTH,
} from "@/lib/brand";
import { fileToResizedDataUrl } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/logo";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function Configuracoes() {
  const { settings, saveSettings, resetAll } = useApp();
  const [form, setForm] = useState<Settings>(settings);
  const [resetOpen, setResetOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const formLabels = getLabels(
    isGameTerm(form.gameTerm) ? form.gameTerm : DEFAULT_GAME_TERM,
  );

  const setNumber = (field: keyof Settings, raw: string) => {
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((prev) => ({ ...prev, groupLogo: dataUrl }));
      toast.success("Logo do grupo carregado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível usar a imagem.",
      );
    }
  };

  const handleSave = () => {
    if (form.maxAttempts < 500) {
      toast.error("O mínimo de tentativas é 500.");
      return;
    }
    if (form.numberOfTeams !== 3 && form.numberOfTeams !== 4) {
      toast.error("A quantidade de times deve ser 3 ou 4.");
      return;
    }
    if (form.playersPerTeam < 5 || form.playersPerTeam > 11) {
      toast.error("O número de jogadores por time deve estar entre 5 e 11.");
      return;
    }

    const groupName =
      form.groupName.trim().slice(0, GROUP_NAME_MAX_LENGTH) || DEFAULT_GROUP_NAME;

    saveSettings({ ...form, groupName });
    toast.success("Configurações salvas com sucesso.");
  };

  const handleReset = () => {
    resetAll();
    setResetOpen(false);
    toast.success("Dados iniciais restaurados com sucesso.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Identidade do grupo, nome do jogo e parâmetros do sorteio.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide">
              Identidade do grupo
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="group-name">Nome do grupo</Label>
                <Input
                  id="group-name"
                  value={form.groupName}
                  maxLength={GROUP_NAME_MAX_LENGTH}
                  placeholder={DEFAULT_GROUP_NAME}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, groupName: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Até {GROUP_NAME_MAX_LENGTH} caracteres. Aparece no cabeçalho e
                  nas imagens compartilhadas.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Como seu grupo chama o jogo</Label>
                <Select
                  value={formLabels.term}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      gameTerm: (isGameTerm(v) ? v : DEFAULT_GAME_TERM) as GameTerm,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Termo do jogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ex.: {formLabels.saveButton} · {formLabels.savedCountLabel} ·{" "}
                  {formLabels.lastDateLabel}
                </p>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Logo do grupo (opcional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Logo
                    src={form.groupLogo ?? APP_LOGO}
                    size={56}
                    alt="Prévia do logo do grupo"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleLogoChange(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Escolher imagem
                  </Button>
                  {form.groupLogo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, groupLogo: null }))
                      }
                    >
                      <X className="h-4 w-4" />
                      Remover logo
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sem logo do grupo, os cards e o cabeçalho usam o logo do
                  aplicativo.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide">
              Parâmetros do sorteio
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="num-teams">Quantidade de times</Label>
                <Select
                  value={String(form.numberOfTeams)}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      numberOfTeams: Number(v) as 3 | 4,
                    }))
                  }
                >
                  <SelectTrigger id="num-teams">
                    <SelectValue placeholder="Times" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 times</SelectItem>
                    <SelectItem value="4">4 times</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Somente 3 ou 4 times.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="per-team">Jogadores por time</Label>
                <Input
                  id="per-team"
                  type="number"
                  min={5}
                  max={11}
                  value={form.playersPerTeam}
                  onChange={(e) => setNumber("playersPerTeam", e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="window">{formLabels.windowLabel}</Label>
                <Input
                  id="window"
                  type="number"
                  min={1}
                  max={30}
                  value={form.historyWindow}
                  onChange={(e) => setNumber("historyWindow", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {formLabels.windowHint}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="star-diff">Diferença máxima de estrelas</Label>
                <Input
                  id="star-diff"
                  type="number"
                  min={0}
                  max={3}
                  value={form.maxStarDifference}
                  onChange={(e) =>
                    setNumber("maxStarDifference", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pos-diff">Diferença máxima por posição</Label>
                <Input
                  id="pos-diff"
                  type="number"
                  min={0}
                  max={3}
                  value={form.maxPositionDifference}
                  onChange={(e) =>
                    setNumber("maxPositionDifference", e.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="attempts">Máximo de tentativas</Label>
                <Input
                  id="attempts"
                  type="number"
                  min={500}
                  max={100000}
                  step={100}
                  value={form.maxAttempts}
                  onChange={(e) => setNumber("maxAttempts", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 500 tentativas.
                </p>
              </div>
            </div>

            <Button className="mt-5" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Salvar configurações
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">
              Regras do sorteio
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Mínimo de 500 tentativas</li>
              <li>Parar quando encontrar score de repetição zero</li>
              <li>Parar após analisar 300 combinações válidas</li>
            </ul>
            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Modo rápido: testa combinações válidas e escolhe a de menor
              repetição entre elas.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-card p-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-destructive">
              Zona de perigo
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Restaura o cadastro, as configurações e o histórico para os
              valores iniciais. Esta ação não pode ser desfeita.
            </p>
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Restaurar dados iniciais
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Restaurar dados iniciais?"
        description="Todo o cadastro, as configurações e o histórico serão substituídos pelos dados iniciais. Esta ação não pode ser desfeita."
        confirmLabel="Restaurar"
        destructive
        onConfirm={handleReset}
      />
    </div>
  );
}
