import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type {
  AppDataSnapshot,
  CurrentDraw,
  Draw,
  DrawResult,
  Player,
  Position,
  Settings,
  SyncStatus,
} from "@/types";
import {
  buildInitialCurrentDraw,
  buildInitialPlayers,
  INITIAL_SETTINGS,
} from "@/data/initialData";
import { isSeeded, markSeeded } from "@/services/storage";
import {
  isDuplicateName,
  validateAndNormalizeRoster,
} from "@/services/playerService";
import {
  ALL_ENTITIES,
  EMPTY_SNAPSHOT,
  chooseNewerSnapshots,
  clearLocalData,
  fetchCloudSnapshot,
  getLastSync,
  getLocalOwner,
  getLocalUpdatedAt,
  getQueue,
  hasLocalData,
  markQueued,
  markTombstone,
  pushEntities,
  readLocalSnapshot,
  setLocalOwner,
  setLocalUpdatedAt,
  writeLocal,
  type CloudSnapshot,
  type EntityKey,
} from "@/services/repository";
import { performDraw } from "@/algorithm/drawAlgorithm";
import { normalizeName, sortPlayers } from "@/lib/normalize";
import { formatDateBR } from "@/lib/format";
import { getLabels, type GameLabels } from "@/lib/labels";
import { useAuth } from "./AuthContext";

export interface PlayerInput {
  name: string;
  position: Position;
  stars: number;
  confirmed: boolean;
}

interface AppContextValue {
  players: Player[];
  settings: Settings;
  currentDraw: CurrentDraw | null;
  history: Draw[];
  /** Rótulos exibidos conforme o termo escolhido para o jogo. */
  labels: GameLabels;
  addPlayer(input: PlayerInput): string | null;
  updatePlayer(id: string, input: PlayerInput): string | null;
  deletePlayer(id: string): void;
  toggleConfirmed(id: string): void;
  updateList(): { success: boolean; messages: string[] };
  saveSettings(settings: Settings): void;
  runDraw(): DrawResult;
  saveBaba(): Draw | null;
  removeBaba(id: string): void;
  resetAll(): void;
  clearAll(): void;
  /** Premium com dados na nuvem. */
  cloudMode: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  online: boolean;
  premiumChoiceOpen: boolean;
  resolvePremiumChoice(choice: "device" | "cloud"): Promise<void>;
  refreshAccount(): Promise<void>;
}

/** Na primeira execução, popula o armazenamento com os dados iniciais. */
function seedIfNeeded(): void {
  if (isSeeded()) return;
  const players = buildInitialPlayers();
  writeLocal({
    players,
    settings: INITIAL_SETTINGS,
    currentDraw: buildInitialCurrentDraw(players),
    history: [],
  });
  markSeeded();
}

function clampStars(stars: number, starScale: number): number {
  const value = Math.round(Number(stars));
  if (!Number.isFinite(value)) return 1;
  return Math.min(starScale, Math.max(1, value));
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isCloud,
    loading: authLoading,
    refreshProfile,
  } = useAuth();
  const userId = user?.id ?? null;

  const [players, setPlayers] = useState<Player[]>(() => {
    seedIfNeeded();
    return readLocalSnapshot().players;
  });
  const [settings, setSettings] = useState<Settings>(
    () => readLocalSnapshot().settings,
  );
  const [currentDraw, setCurrentDraw] = useState<CurrentDraw | null>(
    () => readLocalSnapshot().currentDraw,
  );
  const [history, setHistory] = useState<Draw[]>(
    () => readLocalSnapshot().history,
  );

  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAtState] = useState<number | null>(() =>
    getLastSync(),
  );
  const [premiumChoiceOpen, setPremiumChoiceOpen] = useState(false);

  const pendingCloudRef = useRef<CloudSnapshot | null>(null);
  const transitionRef = useRef<{ userId: string | null; cloud: boolean }>({
    userId: null,
    cloud: false,
  });

  const labels = useMemo<GameLabels>(
    () => getLabels(settings.gameTerm),
    [settings.gameTerm],
  );

  const applySnapshot = useCallback((snapshot: AppDataSnapshot) => {
    setPlayers(snapshot.players);
    setSettings(snapshot.settings);
    setCurrentDraw(snapshot.currentDraw);
    setHistory(snapshot.history);
  }, []);

  /** Grava no aparelho e, no Premium, envia para a nuvem (com fila offline). */
  const persist = useCallback(
    (patch: Partial<AppDataSnapshot>, entities: EntityKey[]) => {
      const at = Date.now();
      writeLocal(patch, at);

      if (!isCloud || !userId) return;

      if (!navigator.onLine) {
        markQueued(entities);
        setSyncStatus("pending");
        return;
      }

      setSyncStatus("syncing");
      void pushEntities(userId, readLocalSnapshot(), entities, at).then((ok) => {
        if (ok) {
          setSyncStatus("idle");
          setLastSyncAtState(getLastSync());
        } else {
          markQueued(entities);
          setSyncStatus(navigator.onLine ? "error" : "pending");
        }
      });
    },
    [isCloud, userId],
  );

  const commit = useCallback(
    (patch: Partial<AppDataSnapshot>, entities: EntityKey[]) => {
      if (patch.players !== undefined) setPlayers(patch.players);
      if (patch.settings !== undefined) setSettings(patch.settings);
      if (patch.currentDraw !== undefined) setCurrentDraw(patch.currentDraw);
      if (patch.history !== undefined) setHistory(patch.history);
      persist(patch, entities);
    },
    [persist],
  );

  const addPlayer = useCallback(
    (input: PlayerInput): string | null => {
      const name = normalizeName(input.name);
      if (!name) return "Informe o nome do jogador.";
      if (isDuplicateName(players, name)) {
        return `Nome duplicado no Cadastro: ${name}.`;
      }
      const player: Player = {
        id: crypto.randomUUID(),
        name,
        position: input.position,
        stars: clampStars(input.stars, settings.starScale),
        confirmed: input.confirmed,
      };
      commit(
        { players: sortPlayers([...players, player]) },
        ["players"],
      );
      return null;
    },
    [players, settings.starScale, commit],
  );

  const updatePlayer = useCallback(
    (id: string, input: PlayerInput): string | null => {
      const name = normalizeName(input.name);
      if (!name) return "Informe o nome do jogador.";
      if (isDuplicateName(players, name, id)) {
        return `Nome duplicado no Cadastro: ${name}.`;
      }
      commit(
        {
          players: sortPlayers(
            players.map((player) =>
              player.id === id
                ? {
                    ...player,
                    name,
                    position: input.position,
                    stars: clampStars(input.stars, settings.starScale),
                    confirmed: input.confirmed,
                  }
                : player,
            ),
          ),
        },
        ["players"],
      );
      return null;
    },
    [players, settings.starScale, commit],
  );

  const deletePlayer = useCallback(
    (id: string) => {
      markTombstone("players", id);
      commit(
        { players: players.filter((player) => player.id !== id) },
        ["players"],
      );
    },
    [players, commit],
  );

  const toggleConfirmed = useCallback(
    (id: string) => {
      commit(
        {
          players: players.map((player) =>
            player.id === id
              ? { ...player, confirmed: !player.confirmed }
              : player,
          ),
        },
        ["players"],
      );
    },
    [players, commit],
  );

  const updateList = useCallback((): {
    success: boolean;
    messages: string[];
  } => {
    const { errors, players: normalized } = validateAndNormalizeRoster(
      players,
      settings.starScale,
    );
    if (errors.length > 0) {
      return { success: false, messages: errors };
    }
    commit({ players: normalized }, ["players"]);
    const meta = settings.numberOfTeams * settings.playersPerTeam;
    const confirmed = normalized.filter((player) => player.confirmed).length;
    const messages: string[] = ["Lista atualizada e ordenada com sucesso."];
    messages.push(
      confirmed === meta
        ? `${confirmed} confirmados. Elenco pronto para o sorteio.`
        : `${confirmed} confirmados para uma meta de ${meta}.`,
    );
    return { success: true, messages };
  }, [players, settings, commit]);

  const saveSettingsCb = useCallback(
    (next: Settings) => {
      commit({ settings: next }, ["settings"]);
    },
    [commit],
  );

  const runDraw = useCallback((): DrawResult => {
    const confirmed = players.filter((player) => player.confirmed);
    const windowSize = Math.max(0, Math.round(settings.historyWindow));
    const lastDraws =
      windowSize === 0 ? [] : history.slice(-windowSize);
    const result = performDraw(confirmed, settings, lastDraws);
    if (result.valid) {
      commit(
        {
          currentDraw: {
            id: crypto.randomUUID(),
            babaNumber: null,
            date: null,
            teams: result.teams,
            repetitionScore: result.repetitionScore,
            attempts: result.attempts,
          },
        },
        ["currentDraw"],
      );
    }
    return result;
  }, [players, settings, history, commit]);

  const saveBaba = useCallback((): Draw | null => {
    if (!currentDraw || currentDraw.teams.length === 0) return null;

    const historyWithNext = [...history];
    const nextNumber =
      historyWithNext.reduce((max, draw) => Math.max(max, draw.babaNumber), 0) + 1;
    const now = new Date();
    const saved: Draw = {
      id: currentDraw.id === "initial-draw" ? crypto.randomUUID() : currentDraw.id,
      babaNumber: nextNumber,
      date: formatDateBR(now),
      historyWindow: settings.historyWindow,
      teams: currentDraw.teams,
      repetitionScore: currentDraw.repetitionScore,
      attempts: currentDraw.attempts,
      createdAt: now.toISOString(),
    };

    const nextHistory = [...historyWithNext, saved];
    commit(
      {
        history: nextHistory,
        currentDraw: {
          ...currentDraw,
          id: saved.id,
          babaNumber: saved.babaNumber,
          date: saved.date,
        },
      },
      ["history", "currentDraw"],
    );
    return saved;
  }, [currentDraw, history, settings.historyWindow, commit]);

  const removeBaba = useCallback(
    (id: string) => {
      markTombstone("matches", id);
      commit(
        { history: history.filter((draw) => draw.id !== id) },
        ["history"],
      );
    },
    [history, commit],
  );

  const resetAll = useCallback(() => {
    players.forEach((player) => markTombstone("players", player.id));
    history.forEach((draw) => markTombstone("matches", draw.id));
    const initialPlayers = buildInitialPlayers();
    commit(
      {
        players: initialPlayers,
        settings: INITIAL_SETTINGS,
        currentDraw: buildInitialCurrentDraw(initialPlayers),
        history: [],
      },
      ALL_ENTITIES,
    );
  }, [players, history, commit]);

  /**
   * "Apagar todos os dados": remove do aparelho e, no Premium, também da nuvem
   * (marcadores de exclusão + estado vazio enviado ao servidor).
   */
  const clearAll = useCallback(() => {
    players.forEach((player) => markTombstone("players", player.id));
    history.forEach((draw) => markTombstone("matches", draw.id));
    commit({ ...EMPTY_SNAPSHOT }, ALL_ENTITIES);
  }, [players, history, commit]);

  /* ---------------------------------------------------------------- */
  /* Entrada / saída do modo nuvem                                     */
  /* ---------------------------------------------------------------- */

  const enterCloud = useCallback(
    async (uid: string) => {
      setSyncStatus("syncing");
      const cloud = await fetchCloudSnapshot(uid);

      if (!cloud) {
        markQueued(ALL_ENTITIES);
        setSyncStatus(navigator.onLine ? "error" : "pending");
        return;
      }

      const local = readLocalSnapshot();
      const localHas = hasLocalData(local);
      const owner = getLocalOwner();

      // Nuvem vazia: envia os dados do aparelho.
      if (cloud.empty) {
        let ok = true;
        if (localHas) {
          ok = await pushEntities(uid, local, ALL_ENTITIES, Date.now());
          if (!ok) markQueued(ALL_ENTITIES);
          if (ok) toast.success("Dados do aparelho enviados para a nuvem.");
        }
        setLocalOwner(uid);
        setSyncStatus(ok ? "idle" : "pending");
        setLastSyncAtState(getLastSync());
        return;
      }

      // Aparelho vazio: baixa a nuvem.
      if (!localHas) {
        applySnapshot(cloud.snapshot);
        writeLocal(cloud.snapshot, 0);
        setLocalUpdatedAt(cloud.updatedAt);
        setLocalOwner(uid);
        setSyncStatus("idle");
        setLastSyncAtState(getLastSync());
        toast.success("Dados da nuvem baixados para o aparelho.");
        return;
      }

      // Mesma conta já sincronizada: resolve por updated_at.
      if (owner === uid) {
        const localUpdatedAt = getLocalUpdatedAt();
        const merged = chooseNewerSnapshots(local, localUpdatedAt, cloud);
        applySnapshot(merged.snapshot);
        writeLocal(merged.snapshot, 0);
        setLocalUpdatedAt({
          players: Math.max(localUpdatedAt.players, cloud.updatedAt.players),
          settings: Math.max(localUpdatedAt.settings, cloud.updatedAt.settings),
          currentDraw: Math.max(
            localUpdatedAt.currentDraw,
            cloud.updatedAt.currentDraw,
          ),
          history: Math.max(localUpdatedAt.history, cloud.updatedAt.history),
        });
        setLocalOwner(uid);

        if (merged.push.length > 0) {
          const ok = await pushEntities(
            uid,
            merged.snapshot,
            merged.push,
            Date.now(),
          );
          if (!ok) markQueued(merged.push);
        }

        setSyncStatus("idle");
        setLastSyncAtState(getLastSync());
        return;
      }

      // Dados nos dois lados de uma conta diferente: perguntar qual manter.
      pendingCloudRef.current = cloud;
      setPremiumChoiceOpen(true);
      setSyncStatus("idle");
    },
    [applySnapshot],
  );

  const leaveCloud = useCallback(
    async (uid: string) => {
      setSyncStatus("syncing");
      const cloud = await fetchCloudSnapshot(uid);
      if (cloud && !cloud.empty) {
        applySnapshot(cloud.snapshot);
        writeLocal(cloud.snapshot, Date.now());
        toast.success("Cópia dos dados da nuvem salva no aparelho.");
      }
      setSyncStatus("idle");
    },
    [applySnapshot],
  );

  useEffect(() => {
    if (authLoading) return;

    const previous = transitionRef.current;
    transitionRef.current = { userId, cloud: isCloud };

    if (!userId) {
      // Saiu da conta: no Premium, limpa a cópia local dela.
      if (previous.userId && previous.cloud) {
        clearLocalData();
        applySnapshot(EMPTY_SNAPSHOT);
        setLastSyncAtState(null);
        setSyncStatus("idle");
      }
      return;
    }

    if (isCloud && (!previous.cloud || previous.userId !== userId)) {
      void enterCloud(userId);
      return;
    }

    if (!isCloud && previous.cloud && previous.userId === userId) {
      void leaveCloud(userId);
    }
  }, [authLoading, userId, isCloud, enterCloud, leaveCloud, applySnapshot]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Ao voltar a internet, envia o que ficou na fila.
  useEffect(() => {
    if (!online || !isCloud || !userId) return;
    const queued = getQueue();
    if (queued.length === 0) return;

    setSyncStatus("syncing");
    void pushEntities(userId, readLocalSnapshot(), [...queued], Date.now()).then(
      (ok) => {
        if (ok) {
          setSyncStatus("idle");
          setLastSyncAtState(getLastSync());
          toast.success("Alterações sincronizadas.");
        } else {
          setSyncStatus("error");
        }
      },
    );
  }, [online, isCloud, userId]);

  const resolvePremiumChoice = useCallback(
    async (choice: "device" | "cloud") => {
      const uid = userId;
      const cloud = pendingCloudRef.current;
      pendingCloudRef.current = null;
      setPremiumChoiceOpen(false);
      if (!uid || !cloud) return;

      if (choice === "cloud") {
        applySnapshot(cloud.snapshot);
        writeLocal(cloud.snapshot, 0);
        setLocalUpdatedAt(cloud.updatedAt);
        setLocalOwner(uid);
        setSyncStatus("idle");
        setLastSyncAtState(getLastSync());
        toast.success("Dados da nuvem aplicados neste aparelho.");
        return;
      }

      setSyncStatus("syncing");
      const ok = await pushEntities(
        uid,
        readLocalSnapshot(),
        ALL_ENTITIES,
        Date.now(),
      );
      setLocalOwner(uid);
      setSyncStatus(ok ? "idle" : "pending");
      if (!ok) markQueued(ALL_ENTITIES);
      if (ok) {
        setLastSyncAtState(getLastSync());
        toast.success("Dados do aparelho enviados para a nuvem.");
      }
    },
    [userId, applySnapshot],
  );

  const refreshAccount = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<AppContextValue>(
    () => ({
      players,
      settings,
      currentDraw,
      history,
      labels,
      addPlayer,
      updatePlayer,
      deletePlayer,
      toggleConfirmed,
      updateList,
      saveSettings: saveSettingsCb,
      runDraw,
      saveBaba,
      removeBaba,
      resetAll,
      clearAll,
      cloudMode: isCloud,
      syncStatus,
      lastSyncAt,
      online,
      premiumChoiceOpen,
      resolvePremiumChoice,
      refreshAccount,
    }),
    [
      players,
      settings,
      currentDraw,
      history,
      labels,
      addPlayer,
      updatePlayer,
      deletePlayer,
      toggleConfirmed,
      updateList,
      saveSettingsCb,
      runDraw,
      saveBaba,
      removeBaba,
      resetAll,
      clearAll,
      isCloud,
      syncStatus,
      lastSyncAt,
      online,
      premiumChoiceOpen,
      resolvePremiumChoice,
      refreshAccount,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp deve ser usado dentro de <AppProvider>.");
  }
  return ctx;
}
