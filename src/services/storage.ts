const PREFIX = "baba-kbriteiros:";

export const STORAGE_KEYS = {
  seeded: `${PREFIX}seeded`,
  players: `${PREFIX}players`,
  settings: `${PREFIX}settings`,
  currentDraw: `${PREFIX}current-draw`,
  history: `${PREFIX}history`,
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  localStorage.removeItem(key);
}

export function isSeeded(): boolean {
  return localStorage.getItem(STORAGE_KEYS.seeded) === "1";
}

export function markSeeded(): void {
  localStorage.setItem(STORAGE_KEYS.seeded, "1");
}
