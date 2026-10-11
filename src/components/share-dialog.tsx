import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, MessageCircle, Share2 } from "lucide-react";
import type { DrawTeam } from "@/types";
import { useApp } from "@/context/AppContext";
import { sortTeamsByNumber } from "@/lib/normalize";
import {
  generateShareImage,
  shareOrDownload,
  whatsAppShareUrl,
} from "@/lib/shareImage";
import { downloadBlob } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: DrawTeam[];
  dateLabel: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  teams,
  dateLabel,
}: ShareDialogProps) {
  const { settings, labels } = useApp();
  const orderedTeams = useMemo(() => sortTeamsByNumber(teams), [teams]);

  const [scope, setScope] = useState("all");
  const [showStars, setShowStars] = useState(true);
  const [preview, setPreview] = useState<{
    url: string;
    blob: Blob;
    fileName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [manualWhatsApp, setManualWhatsApp] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  // Reinicia as opções ao abrir.
  useEffect(() => {
    if (open) {
      setScope("all");
      setShowStars(true);
      setManualWhatsApp(false);
    }
  }, [open]);

  // Libera a URL da prévia ao fechar e ao desmontar.
  useEffect(() => {
    if (open) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
  }, [open]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const selectedTeams = useMemo(
    () =>
      scope === "all"
        ? orderedTeams
        : orderedTeams.filter((t) => String(t.teamNumber) === scope),
    [orderedTeams, scope],
  );

  const scopeLabel = scope === "all" ? undefined : `Time ${scope}`;
  const subtitle =
    scope === "all"
      ? undefined
      : `Time ${scope} • ${labels.term}${dateLabel ? ` • ${dateLabel}` : ""}`;

  useEffect(() => {
    if (!open || selectedTeams.length === 0) return;
    let cancelled = false;

    setLoading(true);
    setManualWhatsApp(false);


    generateShareImage({
      groupName: settings.groupName,
      groupLogo: settings.groupLogo,
      teams: selectedTeams,
      term: labels.term,
      dateLabel,
      showStars,
      subtitle,
      scopeLabel,
    })
      .then((result) => {
        if (cancelled) return;
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(result.blob);
        previewUrlRef.current = url;
        setPreview({ url, blob: result.blob, fileName: result.fileName });
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Não foi possível gerar a imagem para compartilhar.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedTeams,
    settings.groupName,
    settings.groupLogo,
    labels.term,
    dateLabel,
    showStars,
    subtitle,
    scopeLabel,
  ]);

  const handleShare = async () => {
    if (!preview) return;
    setSharing(true);
    try {
      const mode = await shareOrDownload(preview.blob, preview.fileName);
      if (mode === "shared") {
        toast.success("Imagem compartilhada. Escolha o WhatsApp para enviar.");
      } else {
        setManualWhatsApp(true);
        toast.info("Imagem baixada. Abra o WhatsApp e anexe a imagem.");
      }
    } catch (error) {
      // Cancelar o menu de compartilhamento não é erro.
      if (!(error instanceof Error && error.name === "AbortError")) {
        toast.error(
          "Não foi possível compartilhar a imagem. Baixe e envie manualmente.",
        );
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    try {
      downloadBlob(preview.blob, preview.fileName);
      toast.success("Imagem baixada.");
    } catch {
      toast.error("Não foi possível baixar a imagem.");
    }
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsAppShareUrl(), "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compartilhar no WhatsApp</DialogTitle>
          <DialogDescription>
            Prévia da imagem que será enviada. A mensagem não é enviada
            automaticamente: você escolhe o contato ou grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="share-scope">Times na imagem</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="share-scope">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos os times ({orderedTeams.length})
                </SelectItem>
                {orderedTeams.map((team) => (
                  <SelectItem key={team.teamNumber} value={String(team.teamNumber)}>
                    Time {team.teamNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Estrelas</Label>
            <div className="inline-flex rounded-md border border-input p-0.5">
              <Button
                type="button"
                size="sm"
                variant={showStars ? "default" : "ghost"}
                className="flex-1"
                onClick={() => setShowStars(true)}
              >
                Mostrar
              </Button>
              <Button
                type="button"
                size="sm"
                variant={showStars ? "ghost" : "default"}
                className="flex-1"
                onClick={() => setShowStars(false)}
              >
                Ocultar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Vale só para esta imagem; o cadastro não muda.
            </p>
          </div>
        </div>

        <div className="flex max-h-[52vh] items-center justify-center overflow-auto rounded-lg border bg-muted/30 p-2">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : preview ? (
            <img
              src={preview.url}
              alt="Prévia da imagem de compartilhamento dos times"
              className="max-h-[48vh] w-auto rounded-md"
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Não foi possível gerar a imagem.
            </p>
          )}
        </div>

        {manualWhatsApp ? (
          <div className="rounded-md border border-success/40 bg-success-light px-3 py-2 text-xs text-success">
            Imagem baixada. Abra o WhatsApp, escolha o grupo e{" "}
            <strong>anexe a imagem</strong> da galeria para enviar.
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {manualWhatsApp ? (
            <Button variant="secondary" onClick={handleOpenWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" disabled={!preview} onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Baixar imagem
          </Button>
          <Button disabled={!preview || sharing} onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
