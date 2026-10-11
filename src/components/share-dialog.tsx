import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Share2 } from "lucide-react";
import type { DrawTeam } from "@/types";
import { useApp } from "@/context/AppContext";
import { APP_NAME } from "@/lib/brand";
import { generateShareImage, shareOrDownload } from "@/lib/shareImage";
import { downloadBlob } from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
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
  const [preview, setPreview] = useState<{
    url: string;
    blob: Blob;
    fileName: string;
  } | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setLoading(true);
    setPreview(null);

    generateShareImage({
      groupName: settings.groupName,
      groupLogo: settings.groupLogo,
      teams,
      term: labels.term,
      dateLabel,
    })
      .then((result) => {
        if (cancelled) return;
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
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [
    open,
    teams,
    settings.groupName,
    settings.groupLogo,
    labels.term,
    dateLabel,
  ]);

  const handleShare = async () => {
    if (!preview) return;
    setSharing(true);
    try {
      const mode = await shareOrDownload(preview.blob, preview.fileName);
      if (mode === "shared") {
        toast.success("Imagem compartilhada.");
      } else {
        toast.info("Imagem baixada. Envie no WhatsApp.");
      }
    } catch {
      // Compartilhamento cancelado pelo usuário.
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
          <DialogDescription>
            A imagem sai com o nome e o logo do grupo no topo e, no rodapé, a
            assinatura {APP_NAME}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[58vh] items-center justify-center overflow-auto rounded-lg border bg-muted/30 p-2">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : preview ? (
            <img
              src={preview.url}
              alt="Prévia da imagem de compartilhamento dos times"
              className="max-h-[54vh] w-auto rounded-md"
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Não foi possível gerar a imagem.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={!preview}
            onClick={() => preview && downloadBlob(preview.blob, preview.fileName)}
          >
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
