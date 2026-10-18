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
import { STORAGE_KEYS, REPO_KEYS, loadJSON, saveJSON, removeKey } from "./storage";
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
/* Metadados locais                                                    */
/* ------------------------------------------------------------------ */

export function readRepoMeta(): RepoMeta {
  const raw = loadJSON<Partial<RepoMeta>>(REPO_KEYS.meta, {});
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

function writeRepoMeta(meta: RepoMeta): void {
  saveJSON(REPO_KEYS.meta, meta);
}

export function getLocalUpdatedAt(): Record<EntityKey, number> {
  return readRepoMeta().entities;
}

export function setLocalUpdatedAt(entities: Record<EntityKey, number>): void {
  const meta = readRepoMeta();
  meta.entities = { ...meta.entities, ...entities };
  writeRepoMeta(meta);
}

export function markTombstone(
  kind: "players" | "matches",
  id: string,
  at = Date.now(),
): void {
  const meta = readRepoMeta();
  meta.tombstones[kind][id] = at;
  writeRepoMeta(meta);
}

export function markQueued(entities: EntityKey[]): void {
  const meta = readRepoMeta();
  meta.queue = [...new Set([...meta.queue, ...entities])];
  meta.queuedAt = Date.now();
  writeRepoMeta(meta);
}

export function clearQueue(): void {
  const meta = readRepoMeta();
  meta.queue = [];
  meta.queuedAt = null;
  writeRepoMeta(meta);
}

export function getQueue(): EntityKey[] {
  return readRepoMeta().queue;
}

export function setLastSync(at: number): void {
  saveJSON(REPO_KEYS.lastSync, at);
}

export function getLastSync(): number | null {
  const value = loadJSON<number | null>(REPO_KEYS.lastSync, null);
  return typeof value === "number" ? value : null;
}

export function setLocalOwner(userId: string | null): void {
  if (userId) saveJSON(REPO_KEYS.owner, userId);
  else removeKey(REPO_KEYS.owner);
}

export function getLocalOwner(): string | null {
  return loadJSON<string | null>(REPO_KEYS.owner, null);
}

/* ------------------------------------------------------------------ */
/* Cópia local (usada por todo o app)                                  */
/* ------------------------------------------------------------------ */

export function readLocalSnapshot(): AppDataSnapshot {
  return {
    players: loadJSON<Player[]>(STORAGE_KEYS.players, []),
    settings: normalizeSettings(
      loadJSON<Partial<Settings> | null>(STORAGE_KEYS.settings, null),
    ),
    currentDraw: loadJSON<CurrentDraw | null>(STORAGE_KEYS.currentDraw, null),
    history: loadJSON<Draw[]>(STORAGE_KEYS.history, []),
  };
}

export function hasLocalData(snapshot: AppDataSnapshot): boolean {
  return (
    snapshot.players.length > 0 ||
    snapshot.history.length > 0 ||
    snapshot.currentDraw !== null
  );
}

/** Grava a cópia local e marca os conjuntos alterados com o horário. */
export function writeLocal(
  patch: Partial<AppDataSnapshot>,
  at = Date.now(),
): void {
  if (patch.players !== undefined) {
    saveJSON(STORAGE_KEYS.players, patch.players);
  }
  if (patch.settings !== undefined) {
    saveJSON(STORAGE_KEYS.settings, patch.settings);
  }
  if (patch.currentDraw !== undefined) {
    if (patch.currentDraw) saveJSON(STORAGE_KEYS.currentDraw, patch.currentDraw);
    else removeKey(STORAGE_KEYS.currentDraw);
  }
  if (patch.history !== undefined) {
    saveJSON(STORAGE_KEYS.history, patch.history);
  }

  const meta = readRepoMeta();
  (Object.keys(patch) as EntityKey[]).forEach((key) => {
    meta.entities[key] = at;
  });
  writeRepoMeta(meta);
}

/** Remove todos os dados do aparelho (mantém o marcador de seed). */
export function clearLocalData(): void {
  removeKey(STORAGE_KEYS.players);
  removeKey(STORAGE_KEYS.settings);
  removeKey(STORAGE_KEYS.currentDraw);
  removeKey(STORAGE_KEYS.history);
  removeKey(REPO_KEYS.meta);
  removeKey(REPO_KEYS.owner);
  removeKey(REPO_KEYS.lastSync);
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
 * Envia os conjuntos indicados para a nuvem. Devolve false quando não há
 * conexão/erro — nesse caso a alteração permanece na fila.
 */
export async function pushEntities(
  userId: string,
  snapshot: AppDataSnapshot,
  entities: EntityKey[],
  at = Date.now(),
): Promise<boolean> {
  const iso = new Date(at).toISOString();
  const meta = readRepoMeta();

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

    if (
      entities.includes("settings") ||
      entities.includes("currentDraw")
    ) {
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

    writeRepoMeta(meta);
    setLastSync(at);

    const remaining = readRepoMeta();
    remaining.queue = remaining.queue.filter(
      (entity) => !entities.includes(entity),
    );
    remaining.queuedAt = remaining.queue.length > 0 ? Date.now() : null;
    writeRepoMeta(remaining);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve conflitos por `updated_at`: vence o conjunto mais recente.
 * Devolve também o que precisa ser reenviado à nuvem (lado local mais novo).
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
