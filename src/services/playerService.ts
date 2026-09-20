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
 * - nomes duplicados (ignorando maiúsculas/minúsculas);
 * - posição válida (aceita acentos);
 * - estrelas limitadas entre 1 e 5;
 * - ordenação por posição e alfabética.
 */
export function validateAndNormalizeRoster(
  players: Player[],
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
    const stars = Math.min(5, Math.max(1, Math.round(p.stars) || 1));

    if (!cleanName) {
      errors.push("Jogador sem nome encontrado.");
      continue;
    }
    if (!position) {
      errors.push(`Posição inválida para ${cleanName}.`);
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
