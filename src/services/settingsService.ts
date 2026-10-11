import type { Settings } from "@/types";
import { INITIAL_SETTINGS } from "@/data/initialData";
import { DEFAULT_GAME_TERM, isGameTerm } from "@/lib/labels";
import { DEFAULT_GROUP_NAME, GROUP_NAME_MAX_LENGTH } from "@/lib/brand";
import { loadJSON, saveJSON, STORAGE_KEYS } from "./storage";

export function getSettings(): Settings {
  const stored = loadJSON<Partial<Settings>>(STORAGE_KEYS.settings, {});
  const merged = { ...INITIAL_SETTINGS, ...stored };

  return {
    ...merged,
    groupName: (merged.groupName?.trim() || DEFAULT_GROUP_NAME).slice(
      0,
      GROUP_NAME_MAX_LENGTH,
    ),
    groupLogo: merged.groupLogo ?? null,
    gameTerm: isGameTerm(merged.gameTerm) ? merged.gameTerm : DEFAULT_GAME_TERM,
  };
}

export function saveSettings(settings: Settings): void {
  saveJSON(STORAGE_KEYS.settings, settings);
}

export function resetSettings(): void {
  saveJSON(STORAGE_KEYS.settings, INITIAL_SETTINGS);
}
