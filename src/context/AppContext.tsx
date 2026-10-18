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
  DEVICE_SCOPE,
  accountScope,
  isSeeded,
  markSeeded,
} from "@/services/storage";
import { supabase } from "@/integrations/supabase/client";
import {
  isDuplicateName,
  validateAndNormalizeRoster,
} from "@/services/playerService";
import {
  ALL_ENTITIES,
  EMPTY_SNAPSHOT,
  chooseNewerSnapshots,
  clearScope,
  fetchCloudSnapshot,
  getLastSync,
  getLocalUpdatedAt,
  getQueue,
  hasLocalData,
  markQueued,
  markTombstone,
  pushEntities,
  readSnapshot,
  setLastSync,
  setLocalUpdatedAt,
  writeSnapshot,
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
  /** Momento da última atualização vinda da nuvem (realtime ou busca periódica). */
  liveSyncAt: number | null;
  online: boolean;
  /** Pergunta para levar os dados do aparelho quando a conta está vazia. */
  deviceUpload: { players: number } | null;
  acceptDeviceUpload(): Promise<void>;
  declineDeviceUpload(): void;
  refreshAccount(): Promise<void>;
  premiumNotice: PremiumNoticeKind | null;
  showPremiumNotice(kind: PremiumNoticeKind): void;
  dismissPremiumNotice(): void;
}

/** Estrelas aceitas pelo cadastro (o plano limita a entrada, não os dados antigos). */
const MAX_STARS_ABSOLUTE = 10;

/** Primeira execução: app começa vazio, apenas com as configurações padrão. */
function seedIfNeeded(): void {
  if (isSeeded()) return;
  writeSnapshot(DEVICE_SCOPE, { ...EMPTY_SNAPSHOT });
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

  /** Espaço em uso: dados do aparelho ou da conta com nuvem (nunca misturados). */
  const activeScope =
    isCloud && userId ? accountScope(userId) : DEVICE_SCOPE;

  const [players, setPlayers] = useState<Player[]>(
    () => readSnapshot(DEVICE_SCOPE).players,
  );
  const [settings, setSettings] = useState<Settings>(
    () => readSnapshot(DEVICE_SCOPE).settings,
  );
  const [currentDraw, setCurrentDraw] = useState<CurrentDraw | null>(
    () => readSnapshot(DEVICE_SCOPE).currentDraw,
  );
  const [history, setHistory] = useState<Draw[]>(
    () => readSnapshot(DEVICE_SCOPE).history,
  );

  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAtState] = useState<number | null>(() =>
    getLastSync(),
  );
  const [liveSyncAt, setLiveSyncAt] = useState<number | null>(null);
  const [deviceUpload, setDeviceUpload] = useState<{ players: number } | null>(
    null,
  );
  const [premiumNotice, setPremiumNotice] = useState<PremiumNoticeKind | null>(
    null,
  );

  const scopeRef = useRef<string>(DEVICE_SCOPE);
  const pendingDeviceRef = useRef<{
    userId: string;
    scope: string;
    snapshot: AppDataSnapshot;
  } | null>(null);
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

  /** Grava no espaço em uso e, na conta com nuvem, envia para o servidor. */
  const persist = useCallback(
    (patch: Partial<AppDataSnapshot>, entities: EntityKey[]) => {
      const scope = scopeRef.current;
      const at = Date.now();
      writeSnapshot(scope, patch, at);

      if (!isCloud || !userId || scope === DEVICE_SCOPE) return;

      if (!navigator.onLine) {
        markQueued(scope, entities);
        setSyncStatus("pending");
        return;
      }

      setSyncStatus("syncing");
      void pushEntities(
        scope,
        userId,
        readSnapshot(scope),
        entities,
        at,
      ).then((ok) => {
        if (ok) {
          setSyncStatus("idle");
          setLastSyncAtState(getLastSync());
        } else {
          markQueued(scope, entities);
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
      markTombstone(scopeRef.current, "players", id);
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
      const preserved = limits.allowGroupLogo
        ? clamped
        : { ...clamped, groupLogo: settings.groupLogo };
      commit({ settings: preserved }, ["settings"]);
    },
    [commit, limits, settings.groupLogo],
  );

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
    if (limits.maxDrawDaysPerMonth !== null && limits.maxDrawsPerDay !== null) {
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
        return { valid: false, teams: [], repetitionScore: 0, attempts: 0 };
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
      id: currentDraw.id,
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
      markTombstone(scopeRef.current, "matches", id);
      commit(
        { history: history.filter((draw) => draw.id !== id) },
        ["history"],
      );
    },
    [history, commit],
  );

  /** Volta o espaço em uso ao padrão: sem jogadores, sem histórico, configurações padrão. */
  const resetAll = useCallback(() => {
    players.forEach((player) =>
      markTombstone(scopeRef.current, "players", player.id),
    );
    history.forEach((draw) =>
      markTombstone(scopeRef.current, "matches", draw.id),
    );
    commit({ ...EMPTY_SNAPSHOT }, ALL_ENTITIES);
  }, [players, history, commit]);

  const clearAll = useCallback(() => {
    players.forEach((player) =>
      markTombstone(scopeRef.current, "players", player.id),
    );
    history.forEach((draw) =>
      markTombstone(scopeRef.current, "matches", draw.id),
    );
    commit({ ...EMPTY_SNAPSHOT }, ALL_ENTITIES);
  }, [players, history, commit]);

  /* ---------------------------------------------------------------- */
  /* Entrada na conta com nuvem                                        */
  /* ---------------------------------------------------------------- */

  const enterCloudAccount = useCallback(
    async (uid: string, scope: string) => {
      setSyncStatus("syncing");
      const cloud = await fetchCloudSnapshot(uid);

      if (!cloud) {
        setSyncStatus(navigator.onLine ? "error" : "pending");
        if (navigator.onLine) showNetworkToast();
        // Sem rede: mostra o espelho local da conta, se existir.
        applySnapshot(readSnapshot(scope));
        return;
      }

      // A conta já tem dados: usa SOMENTE a nuvem (nunca junta com o aparelho).
      if (!cloud.empty) {
        applySnapshot(cloud.snapshot);
        writeSnapshot(scope, cloud.snapshot, 0);
        setLocalUpdatedAt(scope, cloud.updatedAt);
        const at = Date.now();
        setLastSync(at);
        setLastSyncAtState(at);
        setSyncStatus("idle");
        return;
      }

      // Conta sem dados: começa no padrão e pergunta se quer levar o aparelho.
      applySnapshot(EMPTY_SNAPSHOT);
      writeSnapshot(scope, { ...EMPTY_SNAPSHOT }, 0);
      setSyncStatus("idle");

      const deviceSnapshot = readSnapshot(DEVICE_SCOPE);
      if (hasLocalData(deviceSnapshot) && deviceSnapshot.players.length > 0) {
        pendingDeviceRef.current = {
          userId: uid,
          scope,
          snapshot: deviceSnapshot,
        };
        setDeviceUpload({ players: deviceSnapshot.players.length });
      }
    },
    [applySnapshot, showNetworkToast],
  );

  const acceptDeviceUpload = useCallback(async () => {
    const pending = pendingDeviceRef.current;
    pendingDeviceRef.current = null;
    setDeviceUpload(null);
    if (!pending) return;

    const { userId: uid, scope, snapshot } = pending;
    applySnapshot(snapshot);
    writeSnapshot(scope, snapshot, 0);
    setSyncStatus("syncing");
    const ok = await pushEntities(
      scope,
      uid,
      snapshot,
      ALL_ENTITIES,
      Date.now(),
    );
    setSyncStatus(ok ? "idle" : "pending");
    if (!ok) markQueued(scope, ALL_ENTITIES);
    if (ok) {
      const at = Date.now();
      setLastSync(at);
      setLastSyncAtState(at);
      toast.success("Dados do aparelho enviados para a sua conta.");
    }
  }, [applySnapshot]);

  const declineDeviceUpload = useCallback(() => {
    pendingDeviceRef.current = null;
    setDeviceUpload(null);
  }, []);

  /** Troca de espaço: aparelho ↔ conta. Nunca mistura os dois. */
  useEffect(() => {
    if (authLoading) return;
    if (activeScope === scopeRef.current) return;

    const previous = scopeRef.current;
    scopeRef.current = activeScope;

    if (activeScope === DEVICE_SCOPE) {
      if (previous !== DEVICE_SCOPE) {
        if (userId) {
          // Continua logado, mas sem nuvem: traz uma cópia só se o aparelho
          // ainda não tiver dados próprios (nada é sobrescrito).
          const accountSnapshot = readSnapshot(previous);
          if (
            hasLocalData(accountSnapshot) &&
            !hasLocalData(readSnapshot(DEVICE_SCOPE))
          ) {
            writeSnapshot(DEVICE_SCOPE, accountSnapshot, Date.now());
          }
        } else {
          // Saiu da conta: limpa a cópia local daquela conta.
          clearScope(previous);
        }
      }
      applySnapshot(readSnapshot(DEVICE_SCOPE));
      setSyncStatus("idle");
      setLiveSyncAt(null);
      return;
    }

    if (userId) void enterCloudAccount(userId, activeScope);
  }, [authLoading, activeScope, userId, applySnapshot, enterCloudAccount]);

  /** Busca a nuvem e aplica o que estiver mais novo (foco, realtime, 30s). */
  const pullCloud = useCallback(async () => {
    const scope = scopeRef.current;
    if (!userId || !isCloud || scope === DEVICE_SCOPE) return;

    const cloud = await fetchCloudSnapshot(userId);
    if (!cloud || cloud.empty) return;

    const local = readSnapshot(scope);
    const localUpdatedAt = getLocalUpdatedAt(scope);
    const remoteChanged =
      cloud.updatedAt.players > localUpdatedAt.players ||
      cloud.updatedAt.settings > localUpdatedAt.settings ||
      cloud.updatedAt.currentDraw > localUpdatedAt.currentDraw ||
      cloud.updatedAt.history > localUpdatedAt.history;

    const merged = chooseNewerSnapshots(local, localUpdatedAt, cloud);

    const signature = JSON.stringify(merged.snapshot);
    if (signature !== pullSignatureRef.current) {
      pullSignatureRef.current = signature;
      applySnapshot(merged.snapshot);
      writeSnapshot(scope, merged.snapshot, 0);
      setLocalUpdatedAt(scope, {
        players: Math.max(localUpdatedAt.players, cloud.updatedAt.players),
        settings: Math.max(localUpdatedAt.settings, cloud.updatedAt.settings),
        currentDraw: Math.max(
          localUpdatedAt.currentDraw,
          cloud.updatedAt.currentDraw,
        ),
        history: Math.max(localUpdatedAt.history, cloud.updatedAt.history),
      });
    }

    if (remoteChanged) {
      const at = Date.now();
      setLastSync(at);
      setLastSyncAtState(at);
      setLiveSyncAt(at);
    }

    if (merged.push.length > 0) {
      const ok = await pushEntities(
        scope,
        userId,
        merged.snapshot,
        merged.push,
        Date.now(),
      );
      if (!ok) markQueued(scope, merged.push);
    }
  }, [userId, isCloud, applySnapshot]);

  useEffect(() => {
    if (!isCloud || !userId) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void pullCloud();
    };
    document.addEventListener("visibilitychange", onVisible);
    void pullCloud();

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isCloud, userId, pullCloud]);

  // Garantia: enquanto o app estiver aberto e visível, busca a cada 30 segundos.
  useEffect(() => {
    if (!isCloud || !userId || !online) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void pullCloud();
    }, 30000);

    return () => clearInterval(interval);
  }, [isCloud, userId, online, pullCloud]);

  // Tempo real das próprias linhas; reassina ao voltar a internet ou trocar de conta.
  useEffect(() => {
    if (!isCloud || !userId || !online) return;

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
      .subscribe((status) => {
        // Ao confirmar a assinatura, busca a nuvem uma vez.
        if (status === "SUBSCRIBED") schedule();
      });

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [isCloud, userId, online, pullCloud]);

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
    const scope = scopeRef.current;
    if (!online || !isCloud || !userId || scope === DEVICE_SCOPE) return;
    const queued = getQueue(scope);
    if (queued.length === 0) return;

    setSyncStatus("syncing");
    void pushEntities(
      scope,
      userId,
      readSnapshot(scope),
      [...queued],
      Date.now(),
    ).then((ok) => {
      if (ok) {
        setSyncStatus("idle");
        setLastSyncAtState(getLastSync());
        toast.success("Alterações sincronizadas.");
      } else {
        setSyncStatus("error");
        showNetworkToast();
      }
    });
  }, [online, isCloud, userId, showNetworkToast]);

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
      liveSyncAt,
      online,
      deviceUpload,
      acceptDeviceUpload,
      declineDeviceUpload,
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
      liveSyncAt,
      online,
      deviceUpload,
      acceptDeviceUpload,
      declineDeviceUpload,
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
