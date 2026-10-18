import { loadJSON, saveJSON, REPO_KEYS } from "./storage";

/** Uso de sorteios do plano Grátis, por dia (chave YYYY-MM-DD). */
export interface DrawUsage {
  days: Record<string, number>;
}

export type DrawAllowanceReason = "dayLimit" | "monthLimit";

export function readDrawUsage(): DrawUsage {
  const raw = loadJSON<DrawUsage>(REPO_KEYS.drawUsage, { days: {} });
  return {
    days:
      raw && typeof raw.days === "object" && raw.days !== null ? raw.days : {},
  };
}

/** Dia local no formato YYYY-MM-DD. */
export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Verifica o limite do plano Grátis:
 * - até N sorteios por dia;
 * - até M dias diferentes no mês (o dia de hoje conta se já teve sorteio).
 */
export function checkDrawAllowance(
  usage: DrawUsage,
  todayKey: string,
  maxDrawDaysPerMonth: number,
  maxDrawsPerDay: number,
): { allowed: boolean; reason?: DrawAllowanceReason } {
  const todayCount = usage.days[todayKey] ?? 0;

  if (todayCount >= maxDrawsPerDay) {
    return { allowed: false, reason: "dayLimit" };
  }

  if (todayCount > 0) return { allowed: true };

  const monthPrefix = todayKey.slice(0, 7);
  const daysThisMonth = Object.keys(usage.days).filter(
    (key) => key.startsWith(monthPrefix) && (usage.days[key] ?? 0) > 0,
  );

  if (daysThisMonth.length >= maxDrawDaysPerMonth) {
    return { allowed: false, reason: "monthLimit" };
  }

  return { allowed: true };
}

/** Registra um sorteio hoje (mantém apenas o mês atual). */
export function recordDrawUsage(
  usage: DrawUsage,
  todayKey: string,
): DrawUsage {
  const days: Record<string, number> = {
    [todayKey]: (usage.days[todayKey] ?? 0) + 1,
  };

  const monthPrefix = todayKey.slice(0, 7);
  Object.entries(usage.days).forEach(([key, count]) => {
    if (key.startsWith(monthPrefix)) days[key] = count;
  });

  const next: DrawUsage = { days };
  saveJSON(REPO_KEYS.drawUsage, next);
  return next;
}
