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
import { supabase } from "@/integrations/supabase/client";
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
import {
  checkDrawAllowance,
  localDayKey,
  readDrawUsage,
  recordDrawUsage,
} from "@/services/drawUsage";
import { performDraw } from "@/algorithm/drawAlgorithm";
import { normalizeName, sortPlayers } from "@/lib/normalize";
import { formatDateBR } from "@/lib/format";
import { getLabels, type GameLabels } from "@/lib/labels";
import {
  applyPlanLimits,
  getPlanLimits,
  trialMatchesLeft,
  type PlanLimits,
  type PremiumNoticeKind,
  type PremiumSource,
} from "@/lib/planLimits";
import { NETWORK_ERROR_MESSAGE } from "@/lib/networkMessages";
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
  /** Configurações já limitadas pelo plano em uso. */
  effectiveSettings: Settings;
  limits: PlanLimits;
  isPremium: boolean;
  premiumSource: PremiumSource;
  trialLeft: number;
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
  premiumNotice: PremiumNoticeKind | null;
  showPremiumNotice(kind: PremiumNoticeKind): void;
  dismissPremiumNotice(): void;
}

/** Estrelas aceitas pelo cadastro (o plano limita a entrada, não os dados antigos). */
const MAX_STARS_ABSOLUTE = 10;

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
    isPremium,
    premiumSource,
    profile,
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
  const [premiumNotice, setPremiumNotice] = useState<PremiumNoticeKind | null>(
    null,
  );

  const pendingCloudRef = useRef<CloudSnapshot | null>(null);
  const transitionRef = useRef<{ userId: string | null; cloud: boolean }>({
    userId: null,
    cloud: false,
  });
  const pullSignatureRef = useRef<string>("");
  const lastNetworkToastRef = useRef<number>(0);
  const trialDrawRef = useRef<number>(0);

  const limits = useMemo<PlanLimits>(
    () => getPlanLimits(isPremium),
    [isPremium],
  );
  const effectiveSettings = useMemo<Settings>(
    () => applyPlanLimits(settings, limits),
    [settings, limits],
  );
  const trialLeft = trialMatchesLeft(profile);

  const labels = useMemo<GameLabels>(
    () => getLabels(settings.gameTerm),
    [settings.gameTerm],
  );

  const showNetworkToast = useCallback(() => {
    const now = Date.now();
    if (now - lastNetworkToastRef.current < 15000) return;
    lastNetworkToastRef.current = now;
    toast.error(NETWORK_ERROR_MESSAGE);
  }, []);

  const showPremiumNotice = useCallback((kind: PremiumNoticeKind) => {
    setPremiumNotice(kind);
  }, []);

  const dismissPremiumNotice = useCallback(() => {
    setPremiumNotice(null);
  }, []);

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
          if (navigator.onLine) showNetworkToast();
        }
      });
    },
    [isCloud, userId, showNetworkToast],
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
      if (limits.maxPlayers !== null && players.length >= limits.maxPlayers) {
        return `O plano Grátis permite até ${limits.maxPlayers} jogadores.`;
      }
      if (isDuplicateName(players, name)) {
        return `Nome duplicado no Cadastro: ${name}.`;
      }
      const player: Player = {
        id: crypto.randomUUID(),
        name,
        position: input.position,
        stars: clampStars(input.stars, effectiveSettings.starScale),
        confirmed: input.confirmed,
      };
      commit({ players: sortPlayers([...players, player]) }, ["players"]);
      return null;
    },
    [players, limits.maxPlayers, effectiveSettings.starScale, commit],
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
            players.map((player) => {
              if (player.id !== id) return player;
              // Notas acima da escala do plano atual permanecem como estão.
              const stars =
                player.stars > effectiveSettings.starScale
                  ? Math.min(input.stars, player.stars)
                  : clampStars(input.stars, effectiveSettings.starScale);
              return {
                ...player,
                name,
                position: input.position,
                stars,
                confirmed: input.confirmed,
              };
            }),
          ),
        },
        ["players"],
      );
      return null;
    },
    [players, effectiveSettings.starScale, commit],
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
    // Validação usa o limite absoluto (10) para não invalidar notas antigas.
    const { errors, players: normalized } = validateAndNormalizeRoster(
      players,
      MAX_STARS_ABSOLUTE,
    );
    if (errors.length > 0) {
      return { success: false, messages: errors };
    }
    commit({ players: normalized }, ["players"]);
    const meta =
      effectiveSettings.numberOfTeams * effectiveSettings.playersPerTeam;
    const confirmed = normalized.filter((player) => player.confirmed).length;
    const messages: string[] = ["Lista atualizada e ordenada com sucesso."];
    messages.push(
      confirmed === meta
        ? `${confirmed} confirmados. Elenco pronto para o sorteio.`
        : `${confirmed} confirmados para uma meta de ${meta}.`,
    );
    return { success: true, messages };
  }, [players, effectiveSettings, commit]);

  const saveSettingsCb = useCallback(
    (next: Settings) => {
      const clamped = applyPlanLimits(next, limits);
      // O logo do grupo não é apagado no Grátis — apenas não é usado.
      const preserved = limits.allowGroupLogo
        ? clamped
        : { ...clamped, groupLogo: settings.groupLogo };
      commit({ settings: preserved }, ["settings"]);
    },
    [commit, limits, settings.groupLogo],
  );

  /** Consome 1 partida do teste grátis (no máximo 1 por dia, no servidor). */
  const registerTrialDraw = useCallback(async () => {
    if (!userId || premiumSource !== "trial") return;
    const now = Date.now();
    if (now - trialDrawRef.current < 2000) return;
    trialDrawRef.current = now;

    const { error } = await supabase.rpc("register_trial_draw");
    if (error) {
      if (navigator.onLine) toast.error(NETWORK_ERROR_MESSAGE);
      return;
    }
    await refreshProfile();
  }, [userId, premiumSource, refreshProfile]);

  const runDraw = useCallback((): DrawResult => {
    // Limite de dias/sorteios do plano Grátis.
    if (
      limits.maxDrawDaysPerMonth !== null &&
      limits.maxDrawsPerDay !== null
    ) {
      const allowance = checkDrawAllowance(
        readDrawUsage(),
        localDayKey(),
        limits.maxDrawDaysPerMonth,
        limits.maxDrawsPerDay,
      );
      if (!allowance.allowed) {
        setPremiumNotice(
          allowance.reason === "dayLimit" ? "drawsPerDay" : "drawDays",
        );
        return {
          valid: false,
          teams: [],
          repetitionScore: 0,
          attempts: 0,
        };
      }
    }

    const confirmed = players.filter((player) => player.confirmed);
    const windowSize = Math.max(0, Math.round(effectiveSettings.historyWindow));
    const lastDraws = windowSize === 0 ? [] : history.slice(-windowSize);
    const result = performDraw(confirmed, effectiveSettings, lastDraws);

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

      if (limits.maxDrawDaysPerMonth !== null) {
        recordDrawUsage(readDrawUsage(), localDayKey());
      }
      if (premiumSource === "trial") {
        void registerTrialDraw();
      }
    }

    return result;
  }, [
    players,
    history,
    effectiveSettings,
    limits,
    premiumSource,
    commit,
    registerTrialDraw,
  ]);

  const saveBaba = useCallback((): Draw | null => {
    if (!currentDraw || currentDraw.teams.length === 0) return null;

    const nextNumber =
      history.reduce((max, draw) => Math.max(max, draw.babaNumber), 0) + 1;
    const now = new Date();
    const saved: Draw = {
      id: currentDraw.id === "initial-draw" ? crypto.randomUUID() : currentDraw.id,
      babaNumber: nextNumber,
      date: formatDateBR(now),
      historyWindow: effectiveSettings.historyWindow,
      teams: currentDraw.teams,
      repetitionScore: currentDraw.repetitionScore,
      attempts: currentDraw.attempts,
      createdAt: now.toISOString(),
    };

    commit(
      {
        history: [...history, saved],
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
  }, [currentDraw, history, effectiveSettings.historyWindow, commit]);

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
        if (navigator.onLine) showNetworkToast();
        return;
      }

      const local = readLocalSnapshot();
      const localHas = hasLocalData(local);
      const owner = getLocalOwner();

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

      pendingCloudRef.current = cloud;
      setPremiumChoiceOpen(true);
      setSyncStatus("idle");
    },
    [applySnapshot, showNetworkToast],
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

  /** Busca a nuvem e aplica apenas o que for mais novo (usado no foco/realtime). */
  const pullCloud = useCallback(async () => {
    if (!userId || !isCloud) return;
    const cloud = await fetchCloudSnapshot(userId);
    if (!cloud || cloud.empty) return;

    const local = readLocalSnapshot();
    const localUpdatedAt = getLocalUpdatedAt();
    const merged = chooseNewerSnapshots(local, localUpdatedAt, cloud);

    const signature = JSON.stringify(merged.snapshot);
    if (signature === pullSignatureRef.current) return;
    pullSignatureRef.current = signature;

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
    setLastSyncAtState(getLastSync());

    if (merged.push.length > 0) {
      const ok = await pushEntities(
        userId,
        merged.snapshot,
        merged.push,
        Date.now(),
      );
      if (!ok) markQueued(merged.push);
    }
  }, [userId, isCloud, applySnapshot]);

  useEffect(() => {
    if (authLoading) return;

    const previous = transitionRef.current;
    transitionRef.current = { userId, cloud: isCloud };

    if (!userId) {
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

  // Nuvem ao abrir/voltar ao app + tempo real das próprias linhas.
  useEffect(() => {
    if (!isCloud || !userId) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void pullCloud();
    };
    document.addEventListener("visibilitychange", onVisible);
    void pullCloud();

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isCloud, userId, pullCloud]);

  useEffect(() => {
    if (!isCloud || !userId) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void pullCloud();
      }, 400);
    };

    const channel = supabase
      .channel(`timejusto-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `user_id=eq.${userId}`,
        },
        schedule,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: `user_id=eq.${userId}`,
        },
        schedule,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `user_id=eq.${userId}`,
        },
        schedule,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [isCloud, userId, pullCloud]);

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
          showNetworkToast();
        }
      },
    );
  }, [online, isCloud, userId, showNetworkToast]);

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
      effectiveSettings,
      limits,
      isPremium,
      premiumSource,
      trialLeft,
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
      premiumNotice,
      showPremiumNotice,
      dismissPremiumNotice,
    }),
    [
      players,
      settings,
      effectiveSettings,
      limits,
      isPremium,
      premiumSource,
      trialLeft,
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
      premiumNotice,
      showPremiumNotice,
      dismissPremiumNotice,
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
