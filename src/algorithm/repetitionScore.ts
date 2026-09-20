import type { Draw, DrawTeam } from "@/types";

export interface PairWeights {
  [pairKey: string]: number;
}

/** Chave de dupla independente da ordem e de maiúsculas/minúsculas. */
export function pairKey(nameA: string, nameB: string): string {
  const names = [nameA.trim().toLowerCase(), nameB.trim().toLowerCase()];
  names.sort();
  return names.join("||");
}

/**
 * Constrói o peso histórico de cada dupla de jogadores a partir dos babas
 * fornecidos (já limitados aos últimos historyWindow babas salvos).
 * Cada vez que uma dupla aparece junta em um baba, o peso aumenta em 1.
 */
export function buildPairWeights(draws: Draw[]): PairWeights {
  const weights: PairWeights = {};
  for (const draw of draws) {
    for (const team of draw.teams) {
      const names = team.players.map((p) => p.playerName);
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = pairKey(names[i], names[j]);
          weights[key] = (weights[key] ?? 0) + 1;
        }
      }
    }
  }
  return weights;
}

/** Pontos de repetição de um sorteio: soma dos pesos históricos de cada dupla escalada. */
export function computeRepetitionScore(
  teams: DrawTeam[],
  weights: PairWeights,
): number {
  let score = 0;
  for (const team of teams) {
    const names = team.players.map((p) => p.playerName);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        score += weights[pairKey(names[i], names[j])] ?? 0;
      }
    }
  }
  return score;
}
