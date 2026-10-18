import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export default function Privacidade() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ShieldCheck className="h-6 w-6 text-success" />
          Política de Privacidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Como o {APP_NAME} trata os dados do seu grupo.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-5 text-sm leading-relaxed text-foreground">
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Quais dados o app guarda
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              nomes dos jogadores, posição, notas (estrelas) e se estão
              confirmados;
            </li>
            <li>
              configurações do grupo: nome e logo do grupo, como o grupo chama o
              jogo, quantidade de times, jogadores por time, janela do histórico,
              diferenças máximas de estrelas e por posição, tentativas do sorteio
              e escala de notas;
            </li>
            <li>
              histórico dos sorteios salvos (número, data e os times com os
              jogadores do momento do sorteio);
            </li>
            <li>
              se você cria uma conta: e-mail da conta, guardado no servidor para
              controlar o plano (Grátis ou Premium).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Onde os dados ficam
          </h3>
          <p className="text-muted-foreground">
            Sem conta e no plano Grátis, tudo fica salvo apenas no seu próprio
            aparelho (armazenamento local do navegador/aplicativo). No plano
            Premium, jogadores, configurações e histórico ficam salvos também na
            nuvem, no servidor do app, protegidos pelo seu login. Em qualquer
            caso, uma cópia local é mantida no aparelho para o app abrir rápido e
            funcionar sem internet.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Compartilhamento com terceiros
          </h3>
          <p className="text-muted-foreground">
            Seus dados não são vendidos nem compartilhados com terceiros. Quando
            você usa "Compartilhar no WhatsApp", a imagem é gerada no seu próprio
            aparelho e o envio é feito por você, no aplicativo que escolher.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Conta e exclusão
          </h3>
          <p className="text-muted-foreground">
            Você pode apagar tudo a qualquer momento em Configurações → "Apagar
            todos os dados". Para apagar a conta e todos os dados da nuvem, use
            "Excluir minha conta" em Configurações → Minha conta, ou siga as
            instruções da página{" "}
            <Link
              className="font-medium text-primary underline underline-offset-4"
              to="/excluir-conta"
            >
              Excluir minha conta
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">Contato</h3>
          <p className="text-muted-foreground">
            Dúvidas sobre privacidade:{" "}
            <a
              className="font-medium text-primary underline underline-offset-4"
              href="mailto:timejusto.app@gmail.com"
            >
              timejusto.app@gmail.com
            </a>
          </p>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/sobre">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Sobre
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/excluir-conta">Excluir minha conta</Link>
        </Button>
      </div>
    </div>
  );
}
