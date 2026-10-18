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
 * Pergunta se os dados do aparelho devem ir para a conta.
 * Só aparece quando a conta com nuvem está VAZIA — se a conta já tem dados,
 * eles são usados sozinhos, sem misturar com o aparelho.
 */
export function PremiumSyncDialog() {
  const { deviceUpload, acceptDeviceUpload, declineDeviceUpload } = useApp();
  const open = deviceUpload !== null;
  const count = deviceUpload?.players ?? 0;

  const title =
    count === 1
      ? "Levar o jogador deste aparelho para a sua conta?"
      : `Levar os ${count} jogadores deste aparelho para a sua conta?`;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Sua conta ainda não tem dados na nuvem. Você pode enviar o cadastro
            deste aparelho (jogadores, configurações, sorteio atual e histórico)
            para a conta, ou começar a conta vazia.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Nada é apagado do aparelho em nenhuma das opções: ao sair da conta,
          você volta a ver os dados como estavam.
        </p>

        <div className="grid gap-2">
          <Button
            onClick={() => {
              void acceptDeviceUpload();
            }}
          >
            <Cloud className="h-4 w-4" />
            Levar para a conta
          </Button>
          <Button variant="outline" onClick={declineDeviceUpload}>
            <HardDrive className="h-4 w-4" />
            Começar a conta vazia
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
