import type { Settings } from "@/types";
import { INITIAL_SETTINGS } from "@/data/initialData";
import { DEFAULT_GAME_TERM, isGameTerm } from "@/lib/labels";
import { DEFAULT_GROUP_NAME, GROUP_NAME_MAX_LENGTH } from "@/lib/brand";
import { DEFAULT_STAR_SCALE, isStarScale } from "@/lib/scale";
import { loadJSON, saveJSON, STORAGE_KEYS } from "./storage";

/** Converte para inteiro respeitando o mínimo permitido (sem mínimos ocultos). */
function intAtLeast(value: unknown, min: number, fallback: number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

/**
 * Normaliza um objeto de configurações (do aparelho ou da nuvem) aplicando
 * defaults e limites. Usado como fonte única de verdade para Settings.
 */
export function normalizeSettings(
  raw: Partial<Settings> | null | undefined,
): Settings {
  const merged = { ...INITIAL_SETTINGS, ...(raw ?? {}) };

  return {
    numberOfTeams: intAtLeast(
      merged.numberOfTeams,
      2,
      INITIAL_SETTINGS.numberOfTeams,
    ),
    playersPerTeam: intAtLeast(
      merged.playersPerTeam,
      1,
      INITIAL_SETTINGS.playersPerTeam,
    ),
    historyWindow: intAtLeast(
      merged.historyWindow,
      0,
      INITIAL_SETTINGS.historyWindow,
    ),
    maxStarDifference: intAtLeast(
      merged.maxStarDifference,
      0,
      INITIAL_SETTINGS.maxStarDifference,
    ),
    maxPositionDifference: intAtLeast(
      merged.maxPositionDifference,
      0,
      INITIAL_SETTINGS.maxPositionDifference,
    ),
    maxAttempts: intAtLeast(
      merged.maxAttempts,
      1,
      INITIAL_SETTINGS.maxAttempts,
    ),
    starScale: isStarScale(merged.starScale)
      ? merged.starScale
      : DEFAULT_STAR_SCALE,
    groupName: (merged.groupName?.trim() || DEFAULT_GROUP_NAME).slice(
      0,
      GROUP_NAME_MAX_LENGTH,
    ),
    groupLogo: merged.groupLogo ?? null,
    gameTerm: isGameTerm(merged.gameTerm) ? merged.gameTerm : DEFAULT_GAME_TERM,
  };
}

export function getSettings(): Settings {
  return normalizeSettings(
    loadJSON<Partial<Settings> | null>(STORAGE_KEYS.settings, null),
  );
}

export function saveSettings(settings: Settings): void {
  saveJSON(STORAGE_KEYS.settings, settings);
}

export function resetSettings(): void {
  saveJSON(STORAGE_KEYS.settings, INITIAL_SETTINGS);
}
