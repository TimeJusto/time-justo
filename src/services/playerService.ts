import type { Player, Position } from "@/types";
import { normalizePosition, normalizeName, sortPlayers } from "@/lib/normalize";
import { loadJSON, saveJSON, STORAGE_KEYS } from "./storage";

export function getPlayers(): Player[] {
  return loadJSON<Player[]>(STORAGE_KEYS.players, []);
}

export function savePlayers(players: Player[]): void {
  saveJSON(STORAGE_KEYS.players, players);
}

export function isDuplicateName(
  players: Player[],
  name: string,
  ignoreId?: string,
): boolean {
  const target = name.trim().toLowerCase();
  return players.some(
    (p) => p.id !== ignoreId && p.name.trim().toLowerCase() === target,
  );
}

export interface RosterValidationResult {
  /** Mensagens de erro exibidas ao usuário (lista vazia = sem erros). */
  errors: string[];
  /** Lista normalizada e ordenada. */
  players: Player[];
}

/**
 * Valida e normaliza a lista completa de jogadores:
 * - nome obrigatório;
 * - nomes duplicados (ignorando maiúsculas/minúsculas);
 * - posição obrigatória e válida (aceita acentos);
 * - nota dentro da escala configurada (1–5 ou 1–10);
 * - ordenação por posição e alfabética.
 */
export function validateAndNormalizeRoster(
  players: Player[],
  starScale: number,
): RosterValidationResult {
  if (players.length === 0) {
    return { errors: ["O Cadastro está vazio."], players: [] };
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  const normalized: Player[] = [];

  for (const p of players) {
    const cleanName = normalizeName(p.name);
    const position = normalizePosition(p.position);
    const stars = Math.round(Number(p.stars));

    if (!cleanName) {
      errors.push("Jogador sem nome encontrado.");
      continue;
    }
    if (!position) {
      errors.push(`Posição inválida para ${cleanName}.`);
      continue;
    }
    if (!Number.isFinite(stars) || stars < 1 || stars > starScale) {
      errors.push(
        `Nota inválida para ${cleanName}: use de 1 a ${starScale}.`,
      );
      continue;
    }

    const key = cleanName.toLowerCase();
    if (seen.has(key)) {
      errors.push(`Nome duplicado no Cadastro: ${cleanName}.`);
      continue;
    }
    seen.add(key);

    normalized.push({ ...p, name: cleanName, position, stars });
  }

  return { errors, players: sortPlayers(normalized) };
}
