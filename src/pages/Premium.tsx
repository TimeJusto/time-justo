import { Link } from "react-router-dom";
import { Check, Gem } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  PREMIUM_BENEFITS,
  TRIAL_MATCHES,
  trialMatchesLeft,
} from "@/lib/planLimits";
import { Button } from "@/components/ui/button";

export default function Premium() {
  const { user, profile, premiumSource } = useAuth();
  const remaining = trialMatchesLeft(profile);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Gem className="h-6 w-6 text-primary" />
          Premium
        </h2>
        <p className="text-sm text-muted-foreground">
          Tudo do Time Justo sem limites, para o grupo inteiro.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide">
          O que muda no Premium
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-foreground">
          {PREMIUM_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {!user ? (
        <div className="rounded-xl border bg-success-light p-5 text-success">
          <p className="font-semibold">
            Crie uma conta e ganhe {TRIAL_MATCHES} partidas Premium grátis
          </p>
          <p className="mt-1 text-sm">
            O teste conta 1 partida por dia com sorteio. Sem conta, você continua
            no plano Grátis com os dados no aparelho.
          </p>
          <Button asChild className="mt-3">
            <Link to="/criar-conta">Criar conta</Link>
          </Button>
        </div>
      ) : premiumSource === "trial" ? (
        <div className="rounded-xl border bg-success-light p-5 text-success">
          <p className="font-semibold">
            Teste Premium: faltam {remaining}{" "}
            {remaining === 1 ? "partida" : "partidas"}
          </p>
          <p className="mt-1 text-sm">
            Cada dia com sorteio usa 1 partida do teste. Vários sorteios no mesmo
            dia contam como um só.
          </p>
        </div>
      ) : premiumSource === "free" ? (
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Seu teste já foi usado. Você continua no plano Grátis, com todos os
          seus dados salvos no aparelho.
        </div>
      ) : (
        <div className="rounded-xl border bg-success-light p-5 text-success">
          <p className="font-semibold">Premium ativo</p>
          <p className="mt-1 text-sm">
            Todos os recursos liberados, com os dados na nuvem.
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Como ativar</p>
        <p className="mt-1">
          A ativação do Premium é feita pelo organizador do grupo. Fale com{" "}
          <a
            className="font-medium text-primary underline underline-offset-4"
            href="mailto:timejusto.app@gmail.com"
          >
            timejusto.app@gmail.com
          </a>{" "}
          para liberar na sua conta. Nenhum pagamento é feito dentro do app.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/times">Voltar ao app</Link>
        </Button>
        {user ? (
          <Button asChild variant="ghost">
            <Link to="/configuracoes">Minha conta</Link>
          </Button>
        ) : (
          <Button asChild variant="ghost">
            <Link to="/entrar">Já tenho conta</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
