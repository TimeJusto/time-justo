import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export default function ExcluirConta() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Trash2 className="h-6 w-6 text-destructive" />
          Excluir minha conta
        </h2>
        <p className="text-sm text-muted-foreground">
          Como apagar sua conta do {APP_NAME} e todos os dados ligados a ela.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-5 text-sm leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Pelo próprio aplicativo
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Abra o {APP_NAME} e entre na sua conta.</li>
            <li>Vá em <strong>Configurações</strong>.</li>
            <li>
              Na seção <strong>Minha conta</strong>, toque em{" "}
              <strong>Excluir minha conta</strong> e confirme.
            </li>
          </ol>
          <p className="text-muted-foreground">
            A exclusão é imediata: a conta, o perfil e todos os dados salvos na
            nuvem (jogadores, configurações e histórico) são apagados. Esta ação
            não pode ser desfeita.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Por e-mail
          </h3>
          <p className="text-muted-foreground">
            Se não conseguir entrar no app, envie um e-mail para{" "}
            <a
              className="font-medium text-primary underline underline-offset-4"
              href="mailto:timejusto.app@gmail.com"
            >
              timejusto.app@gmail.com
            </a>{" "}
            a partir do endereço cadastrado, pedindo a exclusão da conta. A
            solicitação é atendida e confirmada por e-mail.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            O que é apagado
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>sua conta de acesso (e-mail e senha);</li>
            <li>seu perfil e a situação do plano;</li>
            <li>jogadores, configurações e histórico salvos na nuvem;</li>
            <li>a cópia guardada no aparelho.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Precisa de ajuda?
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
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
        <ButtonLink to="/privacidade" />
        <ButtonLink to="/configuracoes" back />
      </div>
    </div>
  );
}

function ButtonLink({ to, back = false }: { to: string; back?: boolean }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {back ? <ArrowLeft className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      {back ? "Voltar para Configurações" : "Política de Privacidade"}
    </Link>
  );
}
