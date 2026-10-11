/**
 * Rótulos do jogo. O grupo escolhe como chama o jogo e todos os textos
 * exibidos passam a usar esse termo, com plural e gênero corretos.
 */

export type GameTerm = "Partida" | "Pelada" | "Racha" | "Baba" | "Rachão" | "Futebol";

export const GAME_TERMS: GameTerm[] = [
  "Partida",
  "Pelada",
  "Racha",
  "Baba",
  "Rachão",
  "Futebol",
];

export const DEFAULT_GAME_TERM: GameTerm = "Partida";

interface TermProfile {
  /** true = substantivo feminino (a partida), false = masculino (o baba). */
  feminine: boolean;
  plural: string;
}

const TERM_PROFILES: Record<GameTerm, TermProfile> = {
  Partida: { feminine: true, plural: "partidas" },
  Pelada: { feminine: true, plural: "peladas" },
  Racha: { feminine: false, plural: "rachas" },
  Baba: { feminine: false, plural: "babas" },
  Rachão: { feminine: false, plural: "rachões" },
  Futebol: { feminine: false, plural: "futebóis" },
};

export function isGameTerm(value: unknown): value is GameTerm {
  return typeof value === "string" && GAME_TERMS.includes(value as GameTerm);
}

export interface GameLabels {
  term: GameTerm;
  singular: string;
  plural: string;
  /** "SALVAR PARTIDA" */
  saveButton: string;
  saveConfirmTitle: string;
  saveConfirmDescription: string;
  saveConfirmLabel: string;
  /** "Partida 1 salva no Histórico" */
  savedBadge: (n: number) => string;
  /** "Partida 1 salva no Histórico." */
  savedToast: (n: number) => string;
  /** "Partida 1 excluída do Histórico." */
  deletedToast: (n: number) => string;
  /** "Partidas salvas com seus times completos." */
  historySubtitle: string;
  /** "Partidas salvas" */
  savedCountLabel: string;
  /** "Data da última partida" */
  lastDateLabel: string;
  /** "Janela do histórico (partidas)" */
  windowLabel: string;
  /** "Últimas partidas consideradas na pontuação de repetição." */
  windowHint: string;
  /** "1 partida" / "2 partidas" */
  windowCount: (n: number) => string;
  /** "Nenhuma partida salva ainda. Faça um sorteio e clique em SALVAR PARTIDA." */
  emptyHistory: string;
  /** "Nenhuma partida encontrada com os filtros informados." */
  emptyFiltered: string;
  numberFilterPlaceholder: string;
  /** "Partida 1" */
  itemTitle: (n: number) => string;
  deleteButton: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: (n: number, date: string) => string;
}

/** Monta os rótulos exibidos para o termo escolhido pelo grupo. */
export function getLabels(term: GameTerm): GameLabels {
  const profile = TERM_PROFILES[term] ?? TERM_PROFILES[DEFAULT_GAME_TERM];
  const f = profile.feminine;

  const singular = term.toLowerCase();
  const plural = profile.plural;
  const pluralCap = plural.charAt(0).toUpperCase() + plural.slice(1);

  const article = f ? "a" : "o";
  const articleCap = f ? "A" : "O";
  const none = f ? "Nenhuma" : "Nenhum";
  const saved = f ? "salva" : "salvo";
  const savedPlural = f ? "salvas" : "salvos";
  const removed = f ? "removida" : "removido";
  const excluded = f ? "excluída" : "excluído";
  const lastAdj = f ? "última" : "último";
  const lastAdjCap = f ? "Últimas" : "Últimos";
  const found = f ? "encontrada" : "encontrado";
  const considered = f ? "consideradas" : "considerados";
  const saveButton = `SALVAR ${term.toUpperCase()}`;

  return {
    term,
    singular,
    plural,
    saveButton,
    saveConfirmTitle: `Salvar este sorteio como ${article} ${singular} definitiv${
      f ? "a" : "o"
    }?`,
    saveConfirmDescription: `O sorteio será registrado no Histórico com o número sequencial d${article} ${singular} e a data de hoje.`,
    saveConfirmLabel: `Salvar ${singular}`,
    savedBadge: (n) => `${term} ${n} ${saved} no Histórico`,
    savedToast: (n) => `${term} ${n} ${saved} no Histórico.`,
    deletedToast: (n) => `${term} ${n} ${excluded} do Histórico.`,
    historySubtitle: `${pluralCap} ${savedPlural} com seus times completos.`,
    savedCountLabel: `${pluralCap} ${savedPlural}`,
    lastDateLabel: `Data d${article} ${lastAdj} ${singular}`,
    windowLabel: `Janela do histórico (${plural})`,
    windowHint: `${lastAdjCap} ${plural} ${considered} na pontuação de repetição.`,
    windowCount: (n) => `${n} ${n === 1 ? singular : plural}`,
    emptyHistory: `${none} ${singular} ${saved} ainda. Faça um sorteio e clique em ${saveButton}.`,
    emptyFiltered: `${none} ${singular} ${found} com os filtros informados.`,
    numberFilterPlaceholder: `Filtrar por número d${article} ${singular}`,
    itemTitle: (n) => `${term} ${n}`,
    deleteButton: `Excluir ${singular}`,
    deleteConfirmTitle: `Excluir ${singular} do Histórico?`,
    deleteConfirmDescription: (n, date) =>
      `${articleCap} ${singular} ${n} (${date}) será ${removed} permanentemente.`,
  };
}
