import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HowToStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  "Defina quantos times e quantos jogadores por time em Configurações.",
  "Cadastre os jogadores com estrelas e posição.",
  "Marque quem vai jogar no Elenco do Dia e toque em Sortear.",
];

/** Guia curto de boas-vindas (mostrado no primeiro acesso e pelo menu). */
export function HowToStartDialog({
  open,
  onOpenChange,
}: HowToStartDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Como começar
          </DialogTitle>
          <DialogDescription>
            Três passos para o primeiro sorteio.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Pular
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/configuracoes");
            }}
          >
            Começar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
