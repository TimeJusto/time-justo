import type { Settings } from "@/types";
import { INITIAL_SETTINGS } from "@/data/initialData";
import { loadJSON, saveJSON, STORAGE_KEYS } from "./storage";

export function getSettings(): Settings {
  return {
    ...INITIAL_SETTINGS,
    ...loadJSON<Partial<Settings>>(STORAGE_KEYS.settings, {}),
  };
}

export function saveSettings(settings: Settings): void {
  saveJSON(STORAGE_KEYS.settings, settings);
}

export function resetSettings(): void {
  saveJSON(STORAGE_KEYS.settings, INITIAL_SETTINGS);
}
