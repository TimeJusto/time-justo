import type { Profile, Settings } from "@/types";
import type { StarScale } from "@/lib/scale";

/** Partidas Premium gratuitas do teste (contas novas). */
export const TRIAL_MATCHES = 3;

export type PremiumSource = "admin" | "premium" | "trial" | "free";

export type PremiumNoticeKind =
  | "players"
  | "drawDays"
  | "drawsPerDay"
  | "teams"
  | "settings"
  | "logo"
  | "share"
  | "history"
  | "starScale";

export interface PlanLimits {
  isPremium: boolean;
  /** null = sem limite. */
  maxPlayers: number | null;
  maxTeams: number | null;
  maxPlayersPerTeam: number | null;
  maxDrawDaysPerMonth: number | null;
  maxDrawsPerDay: number | null;
  /** Valor travado da janela do histórico (null = livre). */
  lockedHistoryWindow: number | null;
  maxStarDifference: number | null;
  maxPositionDifference: number | null;
  maxAttempts: number | null;
  starScales: StarScale[];
  allowGroupLogo: boolean;
  allowShareOptions: boolean;
  /** Quantidade de partidas visíveis no histórico (null = todas). */
  visibleHistory: number | null;
}

/** Regras do plano Grátis — ajuste os valores aqui. */
const FREE_LIMITS: PlanLimits = {
  isPremium: false,
  maxPlayers: 40,
  maxTeams: 4,
  maxPlayersPerTeam: 7,
  maxDrawDaysPerMonth: 3,
  maxDrawsPerDay: 3,
  lockedHistoryWindow: 1,
  maxStarDifference: 1,
  maxPositionDifference: 1,
  maxAttempts: 500,
  starScales: [5],
  allowGroupLogo: false,
  allowShareOptions: false,
  visibleHistory: 2,
};

/** Regras do Premium — tudo liberado. */
const PREMIUM_LIMITS: PlanLimits = {
  isPremium: true,
  maxPlayers: null,
  maxTeams: null,
  maxPlayersPerTeam: null,
  maxDrawDaysPerMonth: null,
  maxDrawsPerDay: null,
  lockedHistoryWindow: null,
  maxStarDifference: null,
  maxPositionDifference: null,
  maxAttempts: null,
  starScales: [5, 10],
  allowGroupLogo: true,
  allowShareOptions: true,
  visibleHistory: null,
};

/** Fonte única das regras do plano. */
export function getPlanLimits(isPremium: boolean): PlanLimits {
  return isPremium ? PREMIUM_LIMITS : FREE_LIMITS;
}

/**
 * Origem do acesso Premium:
 * - admin: sempre Premium, sem validade e sem limites;
 * - premium: plano Premium com validade no futuro;
 * - trial: teste grátis ativo (só para quem tem conta);
 * - free: sem recursos Premium.
 */
export function getPremiumSource(profile: Profile | null): PremiumSource {
  if (!profile) return "free";
  if (profile.role === "admin") return "admin";
  if (
    profile.plan === "premium" &&
    profile.premiumUntil &&
    new Date(profile.premiumUntil).getTime() > Date.now()
  ) {
    return "premium";
  }
  if (profile.plan === "free" && profile.trialDaysUsed < TRIAL_MATCHES) {
    return "trial";
  }
  return "free";
}

export function trialMatchesLeft(profile: Profile | null): number {
  if (!profile) return 0;
  return Math.max(0, TRIAL_MATCHES - profile.trialDaysUsed);
}

/** Aplica os limites do plano sobre as configurações salvas. */
export function applyPlanLimits(
  settings: Settings,
  limits: PlanLimits,
): Settings {
  const clampMax = (value: number, max: number | null) =>
    max === null ? value : Math.min(value, max);

  return {
    ...settings,
    numberOfTeams: clampMax(settings.numberOfTeams, limits.maxTeams),
    playersPerTeam: clampMax(
      settings.playersPerTeam,
      limits.maxPlayersPerTeam,
    ),
    historyWindow: limits.lockedHistoryWindow ?? settings.historyWindow,
    maxStarDifference: limits.maxStarDifference ?? settings.maxStarDifference,
    maxPositionDifference:
      limits.maxPositionDifference ?? settings.maxPositionDifference,
    maxAttempts: limits.maxAttempts ?? settings.maxAttempts,
    starScale: limits.starScales.includes(settings.starScale)
      ? settings.starScale
      : limits.starScales[0],
    groupLogo: limits.allowGroupLogo ? settings.groupLogo : null,
  };
}

export const PREMIUM_BENEFITS: string[] = [
  "Jogadores ilimitados (o Grátis vai até 40).",
  "Times, jogadores por time e sorteios sem limite.",
  "Escolha quantas partidas o sorteio considera na repetição.",
  "Ajustes finos de estrelas, posições e tentativas.",
  "Escala de notas de 1 a 10.",
  "Logo do grupo no cabeçalho e nos cards.",
  "Compartilhar um time só e ocultar as estrelas.",
  "Histórico completo, com todas as partidas.",
];

const NOTICE_TEXT: Record<
  PremiumNoticeKind,
  { title: string; description: string }
> = {
  players: {
    title: "Mais de 40 jogadores",
    description:
      "No plano Grátis você pode cadastrar até 40 jogadores. Os jogadores que já existem continuam salvos — no Premium não há limite.",
  },
  drawDays: {
    title: "Sorteios em mais de 3 dias no mês",
    description:
      "No plano Grátis você sorteia em até 3 dias diferentes por mês. No Premium os sorteios são ilimitados.",
  },
  drawsPerDay: {
    title: "Mais de 3 sorteios no mesmo dia",
    description:
      "No plano Grátis são até 3 sorteios por dia. No Premium você sorteia quantas vezes quiser.",
  },
  teams: {
    title: "Mais de 4 times por sorteio",
    description:
      "No plano Grátis o sorteio aceita até 4 times com até 7 jogadores cada. No Premium não há limite.",
  },
  settings: {
    title: "Ajustes finos do sorteio",
    description:
      "Escolher a janela do histórico, as diferenças máximas e o número de tentativas é um recurso Premium.",
  },
  logo: {
    title: "Logo do grupo",
    description:
      "No plano Grátis usamos o logo do Time Justo. No Premium você coloca o logo do seu grupo no cabeçalho e nos cards.",
  },
  share: {
    title: "Compartilhar como quiser",
    description:
      "No plano Grátis a imagem inclui todos os times e as estrelas. No Premium você escolhe um time só e pode ocultar as estrelas.",
  },
  history: {
    title: "Histórico completo",
    description:
      "No plano Grátis você vê as 2 últimas partidas — as anteriores continuam guardadas. No Premium você vê todo o histórico.",
  },
  starScale: {
    title: "Escala de notas 1–10",
    description:
      "No plano Grátis a escala vai de 1 a 5. No Premium você escolhe entre 1–5 e 1–10.",
  },
};

export function premiumNoticeText(kind: PremiumNoticeKind): {
  title: string;
  description: string;
} {
  return NOTICE_TEXT[kind];
}
