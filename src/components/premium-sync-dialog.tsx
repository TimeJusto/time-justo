import { Cloud, HardDrive } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Pergunta qual cópia manter quando os dois lados já têm dados
 * (aparelho e nuvem) ao entrar no plano com dados na nuvem.
 */
export function PremiumSyncDialog() {
  const { premiumChoiceOpen, resolvePremiumChoice } = useApp();

  return (
    <Dialog open={premiumChoiceOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Dados encontrados nos dois lugares</DialogTitle>
          <DialogDescription>
            Sua conta já tem dados na nuvem e este aparelho também tem dados
            salvos. Qual cópia você quer manter? A outra será substituída.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button
            onClick={() => {
              void resolvePremiumChoice("cloud");
            }}
          >
            <Cloud className="h-4 w-4" />
            Usar dados da nuvem
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void resolvePremiumChoice("device");
            }}
          >
            <HardDrive className="h-4 w-4" />
            Manter dados do aparelho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
