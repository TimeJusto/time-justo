import { useNavigate } from "react-router-dom";
import { Gem } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { premiumNoticeText } from "@/lib/planLimits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Aviso amigável ao bater um limite do plano Grátis.
 * Nunca apaga nada: apenas explica o benefício e leva para /premium.
 */
export function PremiumNoticeDialog() {
  const navigate = useNavigate();
  const { premiumNotice, dismissPremiumNotice } = useApp();
  const open = premiumNotice !== null;
  const text = premiumNotice ? premiumNoticeText(premiumNotice) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismissPremiumNotice();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-primary" />
            Recurso Premium
          </DialogTitle>
          <DialogDescription>{text?.title}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{text?.description}</p>
        <p className="text-xs text-muted-foreground">
          Nada é apagado: seus dados continuam salvos.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={dismissPremiumNotice}>
            Agora não
          </Button>
          <Button
            onClick={() => {
              dismissPremiumNotice();
              navigate("/premium");
            }}
          >
            Ver Premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
