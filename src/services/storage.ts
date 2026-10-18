const PREFIX = "baba-kbriteiros:";

export const STORAGE_KEYS = {
  seeded: `${PREFIX}seeded`,
  players: `${PREFIX}players`,
  settings: `${PREFIX}settings`,
  currentDraw: `${PREFIX}current-draw`,
  history: `${PREFIX}history`,
} as const;

/** Chaves internas da camada de dados (metadados de sincronização). */
export const REPO_KEYS = {
  owner: `${PREFIX}local-owner`,
  lastSync: `${PREFIX}last-sync`,
  meta: `${PREFIX}repo-meta`,
  profileCache: `${PREFIX}profile-cache`,
  drawUsage: `${PREFIX}draw-usage`,
} as const;

/** Espaço dos dados do aparelho (plano Grátis, sem login). */
export const DEVICE_SCOPE = "device";

/** Espaço dos dados de uma conta com nuvem (separado do aparelho). */
export function accountScope(userId: string): string {
  return `acct-${userId}`;
}

export interface ScopeKeys {
  players: string;
  settings: string;
  currentDraw: string;
  history: string;
  meta: string;
}

/**
 * Cada espaço tem as próprias chaves: os dados do aparelho nunca se misturam
 * com os da conta. O espaço do aparelho usa as chaves já existentes.
 */
export function scopeKeys(scope: string): ScopeKeys {
  if (scope === DEVICE_SCOPE) {
    return {
      players: STORAGE_KEYS.players,
      settings: STORAGE_KEYS.settings,
      currentDraw: STORAGE_KEYS.currentDraw,
      history: STORAGE_KEYS.history,
      meta: REPO_KEYS.meta,
    };
  }

  const prefix = `${PREFIX}${scope}:`;
  return {
    players: `${prefix}players`,
    settings: `${prefix}settings`,
    currentDraw: `${prefix}current-draw`,
    history: `${prefix}history`,
    meta: `${prefix}meta`,
  };
}

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
