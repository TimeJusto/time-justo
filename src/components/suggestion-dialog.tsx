import { Lightbulb, Mail, MessageCircle } from "lucide-react";
import { APP_VERSION } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Envio de sugestão por e-mail ou pelo WhatsApp. */
export function SuggestionDialog({
  open,
  onOpenChange,
}: SuggestionDialogProps) {
  const handleEmail = () => {
    const subject = encodeURIComponent("Sugestão – Time Justo");
    const body = encodeURIComponent(
      `Versão do app: ${APP_VERSION}\n\nSugestão: `,
    );
    window.location.href = `mailto:timejusto.app@gmail.com?subject=${subject}&body=${body}`;
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent("Sugestão para o Time Justo:");
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Enviar sugestão
          </DialogTitle>
          <DialogDescription>
            Escolha por onde enviar sua sugestão para o Time Justo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button onClick={handleEmail}>
            <Mail className="h-4 w-4" />
            Por e-mail
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            Pelo WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
