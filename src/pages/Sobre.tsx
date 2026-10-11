import { Link } from "react-router-dom";
import { Info, ShieldCheck } from "lucide-react";
import { APP_LOGO, APP_NAME, APP_VERSION } from "@/lib/brand";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function Sobre() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Sobre</h2>
        <p className="text-sm text-muted-foreground">
          Informações do aplicativo.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <Logo src={APP_LOGO} size={64} />
          <div className="min-w-0">
            <div className="truncate text-xl font-bold text-foreground">
              {APP_NAME}
            </div>
            <div className="text-sm text-muted-foreground">
              Versão {APP_VERSION}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Sorteio equilibrado de times para o seu grupo, com pontuação de
          repetição para variar as duplas a cada jogo. Os dados ficam salvos
          apenas no seu aparelho.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/privacidade">
              <ShieldCheck className="h-4 w-4" />
              Política de Privacidade
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href="mailto:eduardo_colmo@hotmail.com">Contato</a>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <Info className="h-4 w-4" />
          Instalar no celular
        </p>
        <p className="mt-1">
          No Android (Chrome), abra o menu do navegador e escolha "Instalar
          aplicativo" ou "Adicionar à tela inicial". Depois disso o {APP_NAME}{" "}
          abre como um app e funciona sem internet.
        </p>
      </div>
    </div>
  );
}
