import { Link } from "react-router-dom";
import { Check, Gem, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  TRIAL_MATCHES,
  getPlanLimits,
  trialMatchesLeft,
} from "@/lib/planLimits";
import type { StarScale } from "@/lib/scale";
import { Button } from "@/components/ui/button";

/** Texto curto para limites numéricos (null = sem limite). */
function countText(value: number | null): string {
  return value === null ? "Sem limite" : String(value);
}

function scaleText(scales: StarScale[]): string {
  return scales.length > 1 ? "1–5 ou 1–10" : `1–${scales[0]}`;
}

export default function Premium() {
  const { user, profile, premiumSource } = useAuth();
  const remaining = trialMatchesLeft(profile);

  // A comparação é montada a partir do arquivo único de regras.
  const free = getPlanLimits(false);
  const premium = getPlanLimits(true);

  const rows: { label: string; free: string; premium: string }[] = [
    {
      label: "Jogadores cadastrados",
      free: countText(free.maxPlayers),
      premium: countText(premium.maxPlayers),
    },
    {
      label: "Times por sorteio",
      free: countText(free.maxTeams),
      premium: countText(premium.maxTeams),
    },
    {
      label: "Jogadores por time",
      free: countText(free.maxPlayersPerTeam),
      premium: countText(premium.maxPlayersPerTeam),
    },
    {
      label: "Sorteios por mês",
      free: `${free.maxDrawDaysPerMonth} dias (${free.maxDrawsPerDay} por dia)`,
      premium: "Sem limite",
    },
    {
      label: "Repetição (partidas consideradas)",
      free: `${free.lockedHistoryWindow} (a última)`,
      premium: "Você escolhe",
    },
    {
      label: "Ajustes finos",
      free: `Padrão (${free.maxStarDifference} / ${free.maxPositionDifference} / ${free.maxAttempts})`,
      premium: "Você ajusta",
    },
    {
      label: "Escala de notas",
      free: scaleText(free.starScales),
      premium: scaleText(premium.starScales),
    },
    {
      label: "Logo do grupo",
      free: free.allowGroupLogo ? "Sim" : "Não",
      premium: premium.allowGroupLogo ? "Sim" : "Não",
    },
    {
      label: "Compartilhar",
      free: "Todos os times, com estrelas",
      premium: "Escolhe o time e as estrelas",
    },
    {
      label: "Histórico visível",
      free: `${free.visibleHistory} últimas partidas`,
      premium: "Completo",
    },
    {
      label: "Onde ficam os dados",
      free: "Neste aparelho",
      premium: "Na nuvem, em todos os aparelhos",
    },
    { label: "Anúncios", free: "Sem anúncios", premium: "Sem anúncios" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Gem className="h-6 w-6 text-primary" />
          Premium
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare os planos e veja o que muda para o seu grupo.
        </p>
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

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-3 gap-2 border-b bg-muted/40 px-3 py-3 text-xs font-bold uppercase tracking-wide sm:px-4">
          <span>Recurso</span>
          <span className="text-center">Grátis</span>
          <span className="text-center text-primary">Premium</span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 items-center gap-2 px-3 py-2.5 text-xs sm:px-4 sm:text-sm"
            >
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-center text-muted-foreground">
                {row.free}
              </span>
              <span className="text-center font-medium text-foreground">
                {row.premium}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide">Assinatura</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-lg font-bold text-foreground">
              R$ 19,90
              <span className="text-sm font-normal text-muted-foreground">
                /mês
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Plano mensal</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-lg font-bold text-foreground">
              R$ 167,90
              <span className="text-sm font-normal text-muted-foreground">
                /ano
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Plano anual (equivale a R$ 13,99/mês)
            </p>
          </div>
        </div>
        <Button disabled className="mt-4 w-full">
          Assinar
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Em breve pelo Google Play
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Como ativar hoje</p>
        <p className="mt-1">
          Enquanto a assinatura não está disponível, a liberação é feita pelo
          organizador do grupo. Fale com{" "}
          <a
            className="font-medium text-primary underline underline-offset-4"
            href="mailto:timejusto.app@gmail.com"
          >
            timejusto.app@gmail.com
          </a>{" "}
          para liberar no seu e-mail. Nenhum pagamento é feito dentro do app.
        </p>
        <ul className="mt-3 space-y-1 text-xs">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            Os preços acima são informativos.
          </li>
          <li className="flex items-start gap-2">
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            Nenhum link de pagamento externo é usado.
          </li>
        </ul>
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
