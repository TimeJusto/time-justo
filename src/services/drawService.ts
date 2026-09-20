import type { CurrentDraw, Draw } from "@/types";
import { formatDateBR } from "@/lib/format";
import { loadJSON, saveJSON, STORAGE_KEYS } from "./storage";

export function getCurrentDraw(): CurrentDraw | null {
  return loadJSON<CurrentDraw | null>(STORAGE_KEYS.currentDraw, null);
}

export function saveCurrentDraw(draw: CurrentDraw): void {
  saveJSON(STORAGE_KEYS.currentDraw, draw);
}

export function getHistory(): Draw[] {
  return loadJSON<Draw[]>(STORAGE_KEYS.history, []);
}

/** Salva o sorteio atual no histórico, gerando o número sequencial (a partir de 1). */
export function saveBabaFromCurrent(
  current: CurrentDraw,
  historyWindow: number,
): Draw {
  const history = getHistory();
  const nextNumber =
    history.reduce((max, d) => Math.max(max, d.babaNumber), 0) + 1;
  const now = new Date();

  const draw: Draw = {
    id: crypto.randomUUID(),
    babaNumber: nextNumber,
    date: formatDateBR(now),
    historyWindow,
    teams: current.teams,
    repetitionScore: current.repetitionScore,
    attempts: current.attempts,
    createdAt: now.toISOString(),
  };

  saveJSON(STORAGE_KEYS.history, [...history, draw]);
  return draw;
}

export function deleteBaba(id: string): void {
  const history = getHistory().filter((d) => d.id !== id);
  saveJSON(STORAGE_KEYS.history, history);
}

/** Últimos N babas salvos, para pontuação de repetição. */
export function getLastDraws(windowSize: number): Draw[] {
  return getHistory().slice(-Math.max(0, windowSize));
}

export function resetHistory(): void {
  saveJSON(STORAGE_KEYS.history, []);
}
