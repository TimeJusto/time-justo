import type { Position } from "@/types";

export const POSITIONS: Position[] = ["Atacante", "Meia", "Zagueiro", "Goleiro"];

export const POSITION_ORDER: Record<Position, number> = {
  Atacante: 0,
  Meia: 1,
  Zagueiro: 2,
  Goleiro: 3,
};

/** Remove acentos (permite comparar "Júlio" e "Julio"). */
export function removeAccents(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Nome normalizado: sem espaços extras nas bordas e sem espaços duplos. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Posição normalizada, aceitando letras com ou sem acentos. */
export function normalizePosition(raw: string): Position | null {
  const clean = removeAccents(raw.trim().toLowerCase());
  const match = POSITIONS.find(
    (p) => removeAccents(p.toLowerCase()) === clean,
  );
  return match ?? null;
}

/** Ordena pelo fluxo do cadastro: posição (A→M→Z→G) e depois alfabético. */
export function sortPlayers<T extends { name: string; position: Position }>(
  players: T[],
): T[] {
  return [...players].sort((a, b) => {
    const posDiff = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (posDiff !== 0) return posDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

/** Ordena jogadores de um time: posição (A→M→Z→G) e, na mesma posição, maior estrela primeiro. */
export function sortTeamPlayers<
  T extends { playerName: string; position: Position; stars: number },
>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    const posDiff = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    if (posDiff !== 0) return posDiff;
    const starDiff = b.stars - a.stars;
    if (starDiff !== 0) return starDiff;
    return a.playerName.localeCompare(b.playerName, "pt-BR");
  });
}
