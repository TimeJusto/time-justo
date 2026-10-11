import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CurrentDraw,
  Draw,
  DrawResult,
  Player,
  Position,
  Settings,
} from "@/types";
import {
  buildInitialCurrentDraw,
  buildInitialPlayers,
  INITIAL_SETTINGS,
} from "@/data/initialData";
import { STORAGE_KEYS, saveJSON } from "@/services/storage";
import {
  getPlayers,
  isDuplicateName,
  savePlayers,
  validateAndNormalizeRoster,
} from "@/services/playerService";
import { getSettings, saveSettings } from "@/services/settingsService";
import {
  deleteBaba,
  getCurrentDraw,
  getHistory,
  saveBabaFromCurrent,
  saveCurrentDraw,
} from "@/services/drawService";
import { performDraw } from "@/algorithm/drawAlgorithm";
import { normalizeName, sortPlayers } from "@/lib/normalize";
import { getLabels, type GameLabels } from "@/lib/labels";

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
}

/** Na primeira execução, popula o localStorage com os dados iniciais. */
function seedIfNeeded(): void {
  if (localStorage.getItem(STORAGE_KEYS.seeded) === "1") return;
  const players = buildInitialPlayers();
  saveJSON(STORAGE_KEYS.players, players);
  saveJSON(STORAGE_KEYS.settings, INITIAL_SETTINGS);
  saveJSON(STORAGE_KEYS.currentDraw, buildInitialCurrentDraw(players));
  saveJSON(STORAGE_KEYS.history, []);
  localStorage.setItem(STORAGE_KEYS.seeded, "1");
}

function clampStars(stars: number): number {
  return Math.min(5, Math.max(1, Math.round(stars) || 1));
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(() => {
    seedIfNeeded();
    return getPlayers();
  });
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [currentDraw, setCurrentDraw] = useState<CurrentDraw | null>(
    getCurrentDraw,
  );
  const [history, setHistory] = useState<Draw[]>(getHistory);

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (currentDraw) saveCurrentDraw(currentDraw);
  }, [currentDraw]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.history, history);
  }, [history]);

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
        stars: clampStars(input.stars),
        confirmed: input.confirmed,
      };
      setPlayers((prev) => sortPlayers([...prev, player]));
      return null;
    },
    [players],
  );

  const updatePlayer = useCallback(
    (id: string, input: PlayerInput): string | null => {
      const name = normalizeName(input.name);
      if (!name) return "Informe o nome do jogador.";
      if (isDuplicateName(players, name, id)) {
        return `Nome duplicado no Cadastro: ${name}.`;
      }
      setPlayers((prev) =>
        sortPlayers(
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name,
                  position: input.position,
                  stars: clampStars(input.stars),
                  confirmed: input.confirmed,
                }
              : p,
          ),
        ),
      );
      return null;
    },
    [players],
  );

  const deletePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleConfirmed = useCallback((id: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, confirmed: !p.confirmed } : p,
      ),
    );
  }, []);

  const updateList = useCallback((): {
    success: boolean;
    messages: string[];
  } => {
    const { errors, players: normalized } = validateAndNormalizeRoster(players);
    if (errors.length > 0) {
      return { success: false, messages: errors };
    }
    setPlayers(normalized);
    const meta = settings.numberOfTeams * settings.playersPerTeam;
    const confirmed = normalized.filter((p) => p.confirmed).length;
    const messages: string[] = ["Lista atualizada e ordenada com sucesso."];
    messages.push(
      confirmed === meta
        ? `${confirmed} confirmados. Elenco pronto para o sorteio.`
        : `${confirmed} confirmados para uma meta de ${meta}.`,
    );
    return { success: true, messages };
  }, [players, settings]);

  const saveSettingsCb = useCallback((next: Settings) => {
    setSettings(next);
  }, []);

  const runDraw = useCallback((): DrawResult => {
    const confirmed = players.filter((p) => p.confirmed);
    const lastDraws = history.slice(-Math.max(0, settings.historyWindow));
    const result = performDraw(confirmed, settings, lastDraws);
    if (result.valid) {
      setCurrentDraw({
        id: crypto.randomUUID(),
        babaNumber: null,
        date: null,
        teams: result.teams,
        repetitionScore: result.repetitionScore,
        attempts: result.attempts,
      });
    }
    return result;
  }, [players, settings, history]);

  const saveBaba = useCallback((): Draw | null => {
    if (!currentDraw || currentDraw.teams.length === 0) return null;
    const saved = saveBabaFromCurrent(currentDraw, settings.historyWindow);
    setHistory((prev) => [...prev, saved]);
    setCurrentDraw((prev) =>
      prev
        ? {
            ...prev,
            id: saved.id,
            babaNumber: saved.babaNumber,
            date: saved.date,
          }
        : prev,
    );
    return saved;
  }, [currentDraw, settings.historyWindow]);

  const removeBaba = useCallback((id: string) => {
    deleteBaba(id);
    setHistory((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    const initialPlayers = buildInitialPlayers();
    setPlayers(initialPlayers);
    setSettings(INITIAL_SETTINGS);
    setCurrentDraw(buildInitialCurrentDraw(initialPlayers));
    setHistory([]);
  }, []);

  const labels = useMemo<GameLabels>(
    () => getLabels(settings.gameTerm),
    [settings.gameTerm],
  );

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
