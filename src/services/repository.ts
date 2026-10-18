import type {
  AppDataSnapshot,
  CurrentDraw,
  Draw,
  DrawTeam,
  Player,
  Position,
  Settings,
} from "@/types";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { REPO_KEYS, loadJSON, saveJSON, removeKey, scopeKeys } from "./storage";
import { normalizeSettings } from "./settingsService";
import { INITIAL_SETTINGS } from "@/data/initialData";

export type EntityKey = "players" | "settings" | "currentDraw" | "history";

export const ALL_ENTITIES: EntityKey[] = [
  "players",
  "settings",
  "currentDraw",
  "history",
];

interface RepoMeta {
  /** Última alteração local de cada conjunto de dados (epoch ms). */
  entities: Record<EntityKey, number>;
  /** Marcadores de exclusão (id → epoch ms) para propagar remoções. */
  tombstones: {
    players: Record<string, number>;
    matches: Record<string, number>;
  };
  /** Conjuntos com alterações ainda não enviadas à nuvem. */
  queue: EntityKey[];
  queuedAt: number | null;
}

const EMPTY_META: RepoMeta = {
  entities: { players: 0, settings: 0, currentDraw: 0, history: 0 },
  tombstones: { players: {}, matches: {} },
  queue: [],
  queuedAt: null,
};

/* ------------------------------------------------------------------ */
/* Metadados locais (por espaço: aparelho ou conta)                    */
/* ------------------------------------------------------------------ */

export function readRepoMeta(scope: string): RepoMeta {
  const raw = loadJSON<Partial<RepoMeta>>(scopeKeys(scope).meta, {});
  return {
    entities: { ...EMPTY_META.entities, ...(raw.entities ?? {}) },
    tombstones: {
      players: raw.tombstones?.players ?? {},
      matches: raw.tombstones?.matches ?? {},
    },
    queue: Array.isArray(raw.queue) ? raw.queue : [],
    queuedAt: typeof raw.queuedAt === "number" ? raw.queuedAt : null,
  };
}

function writeRepoMeta(scope: string, meta: RepoMeta): void {
  saveJSON(scopeKeys(scope).meta, meta);
}

export function getLocalUpdatedAt(scope: string): Record<EntityKey, number> {
  return readRepoMeta(scope).entities;
}

export function setLocalUpdatedAt(
  scope: string,
  entities: Record<EntityKey, number>,
): void {
  const meta = readRepoMeta(scope);
  meta.entities = { ...meta.entities, ...entities };
  writeRepoMeta(scope, meta);
}

export function markTombstone(
  scope: string,
  kind: "players" | "matches",
  id: string,
  at = Date.now(),
): void {
  const meta = readRepoMeta(scope);
  meta.tombstones[kind][id] = at;
  writeRepoMeta(scope, meta);
}

export function markQueued(scope: string, entities: EntityKey[]): void {
  const meta = readRepoMeta(scope);
  meta.queue = [...new Set([...meta.queue, ...entities])];
  meta.queuedAt = Date.now();
  writeRepoMeta(scope, meta);
}

export function clearQueue(scope: string): void {
  const meta = readRepoMeta(scope);
  meta.queue = [];
  meta.queuedAt = null;
  writeRepoMeta(scope, meta);
}

export function getQueue(scope: string): EntityKey[] {
  return readRepoMeta(scope).queue;
}

export function setLastSync(at: number): void {
  saveJSON(REPO_KEYS.lastSync, at);
}

export function getLastSync(): number | null {
  const value = loadJSON<number | null>(REPO_KEYS.lastSync, null);
  return typeof value === "number" ? value : null;
}

/* ------------------------------------------------------------------ */
/* Dados locais                                                        */
/* ------------------------------------------------------------------ */

export function readSnapshot(scope: string): AppDataSnapshot {
  const keys = scopeKeys(scope);
  return {
    players: loadJSON<Player[]>(keys.players, []),
    settings: normalizeSettings(
      loadJSON<Partial<Settings> | null>(keys.settings, null),
    ),
    currentDraw: loadJSON<CurrentDraw | null>(keys.currentDraw, null),
    history: loadJSON<Draw[]>(keys.history, []),
  };
}

export function hasLocalData(snapshot: AppDataSnapshot): boolean {
  return (
    snapshot.players.length > 0 ||
    snapshot.history.length > 0 ||
    snapshot.currentDraw !== null
  );
}

/** Grava no espaço indicado e marca os conjuntos alterados com o horário. */
export function writeSnapshot(
  scope: string,
  patch: Partial<AppDataSnapshot>,
  at = Date.now(),
): void {
  const keys = scopeKeys(scope);

  if (patch.players !== undefined) saveJSON(keys.players, patch.players);
  if (patch.settings !== undefined) saveJSON(keys.settings, patch.settings);
  if (patch.currentDraw !== undefined) {
    if (patch.currentDraw) saveJSON(keys.currentDraw, patch.currentDraw);
    else removeKey(keys.currentDraw);
  }
  if (patch.history !== undefined) saveJSON(keys.history, patch.history);

  const meta = readRepoMeta(scope);
  (Object.keys(patch) as EntityKey[]).forEach((key) => {
    meta.entities[key] = at;
  });
  writeRepoMeta(scope, meta);
}

/** Remove todos os dados do espaço indicado. */
export function clearScope(scope: string): void {
  const keys = scopeKeys(scope);
  removeKey(keys.players);
  removeKey(keys.settings);
  removeKey(keys.currentDraw);
  removeKey(keys.history);
  removeKey(keys.meta);
}

export const EMPTY_SNAPSHOT: AppDataSnapshot = {
  players: [],
  settings: INITIAL_SETTINGS,
  currentDraw: null,
  history: [],
};

/* ------------------------------------------------------------------ */
/* Nuvem                                                               */
/* ------------------------------------------------------------------ */

export interface CloudSnapshot {
  snapshot: AppDataSnapshot;
  updatedAt: Record<EntityKey, number>;
  empty: boolean;
}

const isoToMs = (iso: string | null | undefined): number =>
  iso ? new Date(iso).getTime() : 0;

export async function fetchCloudSnapshot(
  userId: string,
): Promise<CloudSnapshot | null> {
  try {
    const [playersRes, settingsRes, matchesRes] = await Promise.all([
      supabase.from("players").select("*").eq("user_id", userId),
      supabase
        .from("app_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("matches").select("*").eq("user_id", userId),
    ]);

    if (playersRes.error || settingsRes.error || matchesRes.error) return null;

    const playerRows = playersRes.data ?? [];
    const matchRows = matchesRes.data ?? [];
    const settingsRow = settingsRes.data;

    const players: Player[] = playerRows.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position as Position,
      stars: row.stars,
      confirmed: row.confirmed,
    }));

    const history: Draw[] = matchRows.map((row) => ({
      id: row.id,
      babaNumber: row.baba_number,
      date: row.date,
      historyWindow: row.history_window,
      teams: (row.teams as unknown as DrawTeam[]) ?? [],
      repetitionScore: row.repetition_score,
      attempts: row.attempts,
      createdAt: row.created_at,
    }));

    const settings = settingsRow
      ? normalizeSettings(settingsRow.settings as unknown as Partial<Settings>)
      : normalizeSettings(null);

    const currentDraw =
      (settingsRow?.current_draw as unknown as CurrentDraw | null) ?? null;

    const playersUpdatedAt = playerRows.reduce(
      (max, row) => Math.max(max, isoToMs(row.updated_at)),
      0,
    );
    const settingsUpdatedAt = isoToMs(settingsRow?.updated_at);
    const historyUpdatedAt = matchRows.reduce(
      (max, row) => Math.max(max, isoToMs(row.updated_at)),
      0,
    );

    return {
      snapshot: { players, settings, currentDraw, history },
      updatedAt: {
        players: playersUpdatedAt,
        settings: settingsUpdatedAt,
        currentDraw: settingsUpdatedAt,
        history: historyUpdatedAt,
      },
      empty: playerRows.length === 0 && !settingsRow && matchRows.length === 0,
    };
  } catch {
    return null;
  }
}

/**
 * Envia os conjuntos indicados para a nuvem a partir do espaço informado.
 * Devolve false quando não há conexão/erro — a alteração fica na fila.
 */
export async function pushEntities(
  scope: string,
  userId: string,
  snapshot: AppDataSnapshot,
  entities: EntityKey[],
  at = Date.now(),
): Promise<boolean> {
  const iso = new Date(at).toISOString();
  const meta = readRepoMeta(scope);

  try {
    if (entities.includes("players")) {
      if (snapshot.players.length > 0) {
        const { error } = await supabase.from("players").upsert(
          snapshot.players.map((player) => ({
            id: player.id,
            user_id: userId,
            name: player.name,
            position: player.position,
            stars: player.stars,
            confirmed: player.confirmed,
            updated_at: iso,
          })),
          { onConflict: "id" },
        );
        if (error) throw error;
      }

      for (const [id, tombstoneAt] of Object.entries(meta.tombstones.players)) {
        if (tombstoneAt > at) continue;
        const { error } = await supabase
          .from("players")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        delete meta.tombstones.players[id];
      }
    }

    if (entities.includes("settings") || entities.includes("currentDraw")) {
      const { error } = await supabase.from("app_settings").upsert(
        {
          user_id: userId,
          settings: snapshot.settings as unknown as Json,
          current_draw: (snapshot.currentDraw ?? null) as unknown as Json,
          updated_at: iso,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    }

    if (entities.includes("history")) {
      if (snapshot.history.length > 0) {
        const { error } = await supabase.from("matches").upsert(
          snapshot.history.map((draw) => ({
            id: draw.id,
            user_id: userId,
            baba_number: draw.babaNumber,
            date: draw.date,
            history_window: draw.historyWindow,
            teams: draw.teams as unknown as Json,
            repetition_score: draw.repetitionScore,
            attempts: draw.attempts,
            updated_at: iso,
          })),
          { onConflict: "id" },
        );
        if (error) throw error;
      }

      for (const [id, tombstoneAt] of Object.entries(meta.tombstones.matches)) {
        if (tombstoneAt > at) continue;
        const { error } = await supabase
          .from("matches")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) throw error;
        delete meta.tombstones.matches[id];
      }
    }

    writeRepoMeta(scope, meta);
    setLastSync(at);

    const remaining = readRepoMeta(scope);
    remaining.queue = remaining.queue.filter(
      (entity) => !entities.includes(entity),
    );
    remaining.queuedAt = remaining.queue.length > 0 ? Date.now() : null;
    writeRepoMeta(scope, remaining);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve conflitos por `updated_at`: vence o conjunto mais recente.
 * Usado apenas dentro do espaço da conta (nunca mistura com o aparelho).
 */
export function chooseNewerSnapshots(
  local: AppDataSnapshot,
  localUpdatedAt: Record<EntityKey, number>,
  cloud: CloudSnapshot,
): { snapshot: AppDataSnapshot; push: EntityKey[] } {
  const push: EntityKey[] = [];

  const pick = <T,>(
    localValue: T,
    cloudValue: T,
    localTs: number,
    cloudTs: number,
    entity: EntityKey,
  ): T => {
    if (cloudTs > localTs) return cloudValue;
    if (localTs > cloudTs) {
      push.push(entity);
      return localValue;
    }
    return localValue;
  };

  return {
    snapshot: {
      players: pick(
        local.players,
        cloud.snapshot.players,
        localUpdatedAt.players,
        cloud.updatedAt.players,
        "players",
      ),
      settings: pick(
        local.settings,
        cloud.snapshot.settings,
        localUpdatedAt.settings,
        cloud.updatedAt.settings,
        "settings",
      ),
      currentDraw: pick(
        local.currentDraw,
        cloud.snapshot.currentDraw,
        localUpdatedAt.currentDraw,
        cloud.updatedAt.currentDraw,
        "currentDraw",
      ),
      history: pick(
        local.history,
        cloud.snapshot.history,
        localUpdatedAt.history,
        cloud.updatedAt.history,
        "history",
      ),
    },
    push,
  };
}
