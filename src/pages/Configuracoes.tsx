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
  DEFAULT_STAR_SCALE,
  STAR_SCALES,
  isStarScale,
  type StarScale,
} from "@/lib/scale";
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

  const requiredPlayers = form.numberOfTeams * form.playersPerTeam;

  /** Campos numéricos: aceitam apenas dígitos (a validação acontece ao salvar). */
  const setNumber = (field: keyof Settings, raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    setForm((prev) => ({ ...prev, [field]: digits === "" ? 0 : Number(digits) }));
  };

  const handleLogoChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((prev) => ({ ...prev, groupLogo: dataUrl }));
      toast.success("Logo do grupo carregado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível usar a imagem.",
      );
    }
  };

  const handleSave = () => {
    if (form.numberOfTeams < 2) {
      toast.error("A quantidade de times deve ser no mínimo 2.");
      return;
    }
    if (form.playersPerTeam < 1) {
      toast.error("O número de jogadores por time deve ser no mínimo 1.");
      return;
    }
    if (form.maxAttempts < 1) {
      toast.error("O número de tentativas deve ser no mínimo 1.");
      return;
    }

    const normalized: Settings = {
      ...form,
      numberOfTeams: Math.max(2, Math.round(form.numberOfTeams)),
      playersPerTeam: Math.max(1, Math.round(form.playersPerTeam)),
      historyWindow: Math.max(0, Math.round(form.historyWindow)),
      maxStarDifference: Math.max(0, Math.round(form.maxStarDifference)),
      maxPositionDifference: Math.max(0, Math.round(form.maxPositionDifference)),
      maxAttempts: Math.max(1, Math.round(form.maxAttempts)),
      starScale: isStarScale(form.starScale) ? form.starScale : DEFAULT_STAR_SCALE,
      groupName:
        form.groupName.trim().slice(0, GROUP_NAME_MAX_LENGTH) ||
        DEFAULT_GROUP_NAME,
    };

    saveSettings(normalized);
    setForm(normalized);
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
                      gameTerm: (isGameTerm(v)
                        ? v
                        : DEFAULT_GAME_TERM) as GameTerm,
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
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">
              Parâmetros do sorteio
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Jogadores necessários: {requiredPlayers} ({form.numberOfTeams}{" "}
              {form.numberOfTeams === 1 ? "time" : "times"} ×{" "}
              {form.playersPerTeam}{" "}
              {form.playersPerTeam === 1 ? "jogador" : "jogadores"} por time)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="num-teams">Quantidade de times</Label>
                <Input
                  id="num-teams"
                  type="number"
                  min={2}
                  value={form.numberOfTeams}
                  onChange={(e) => setNumber("numberOfTeams", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 2 times, sem limite máximo.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="per-team">Jogadores por time</Label>
                <Input
                  id="per-team"
                  type="number"
                  min={1}
                  value={form.playersPerTeam}
                  onChange={(e) => setNumber("playersPerTeam", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 1 jogador por time.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="star-scale">Escala de notas</Label>
                <Select
                  value={String(form.starScale)}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      starScale: (isStarScale(Number(v))
                        ? Number(v)
                        : DEFAULT_STAR_SCALE) as StarScale,
                    }))
                  }
                >
                  <SelectTrigger id="star-scale">
                    <SelectValue placeholder="Escala" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAR_SCALES.map((scale) => (
                      <SelectItem key={scale} value={String(scale)}>
                        Notas de 1 a {scale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  As notas já cadastradas não são convertidas ao trocar a escala.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="window">{formLabels.windowLabel}</Label>
                <Input
                  id="window"
                  type="number"
                  min={0}
                  value={form.historyWindow}
                  onChange={(e) => setNumber("historyWindow", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {formLabels.windowHint} Use 0 para ignorar sorteios anteriores.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="star-diff">Diferença máxima de estrelas</Label>
                <Input
                  id="star-diff"
                  type="number"
                  min={0}
                  value={form.maxStarDifference}
                  onChange={(e) =>
                    setNumber("maxStarDifference", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Diferença entre o maior e o menor total de estrelas dos times.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pos-diff">Diferença máxima por posição</Label>
                <Input
                  id="pos-diff"
                  type="number"
                  min={0}
                  value={form.maxPositionDifference}
                  onChange={(e) =>
                    setNumber("maxPositionDifference", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Diferença da quantidade de cada posição entre os times.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="attempts">Tentativas do sorteio</Label>
                <Input
                  id="attempts"
                  type="number"
                  min={1}
                  value={form.maxAttempts}
                  onChange={(e) => setNumber("maxAttempts", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Número exato de tentativas, sem mínimo oculto.
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
              <li>
                {form.maxAttempts}{" "}
                {form.maxAttempts === 1 ? "tentativa" : "tentativas"} por sorteio
              </li>
              <li>Parar quando encontrar score de repetição zero</li>
              <li>Parar após analisar 300 combinações válidas</li>
              <li>
                Notas de 1 a {form.starScale} no cadastro e na contagem
              </li>
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
