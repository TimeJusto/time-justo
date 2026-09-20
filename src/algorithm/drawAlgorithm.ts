import type {
  Draw,
  DrawDiagnostics,
  DrawPlayer,
  DrawResult,
  DrawTeam,
  DrawValidation,
  Player,
  Position,
  Settings,
} from "@/types";
import { POSITIONS } from "@/lib/normalize";
import { buildPairWeights, computeRepetitionScore } from "./repetitionScore";

const MAX_VALID_ANALYZED = 300;

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface WorkingTeam {
  teamNumber: number;
  players: DrawPlayer[];
}

function toDrawPlayer(p: Player): DrawPlayer {
  return {
    playerId: p.id,
    playerName: p.name,
    position: p.position,
    stars: p.stars,
  };
}

function teamStarSum(t: WorkingTeam): number {
  return t.players.reduce((sum, p) => sum + p.stars, 0);
}

function countPosition(t: WorkingTeam, position: Position): number {
  return t.players.filter((p) => p.position === position).length;
}

function failingResult(
  attempts: number,
  error?: string,
  diagnostics?: DrawDiagnostics,
): DrawResult {
  return { valid: false, teams: [], repetitionScore: 0, attempts, error, diagnostics };
}

/**
 * Algoritmo real de sorteio:
 * - pré-validações (times 3/4, quantidade exata de confirmados, goleiros ≤ times);
 * - goleiros distribuídos um por time;
 * - jogadores de linha embaralhados e ordenados por estrelas;
 * - cada jogador vai para um time elegível de menor soma de estrelas (aleatório entre empates);
 * - validação final obrigatória (7 por time, ≤1 goleiro, diferenças ≤ máximos);
 * - roda até maxAttempts, analisa no máximo 300 resultados válidos,
 *   guarda o de menor pontuação de repetição e encerra ao atingir 0.
 */
export function performDraw(
  confirmed: Player[],
  settings: Settings,
  lastDraws: Draw[],
): DrawResult {
  const {
    numberOfTeams,
    playersPerTeam,
    maxStarDifference,
    maxPositionDifference,
    maxAttempts,
  } = settings;

  if (numberOfTeams !== 3 && numberOfTeams !== 4) {
    return failingResult(0, "A quantidade de times deve ser 3 ou 4.");
  }

  const required = numberOfTeams * playersPerTeam;
  if (confirmed.length !== required) {
    return failingResult(
      0,
      `Para ${numberOfTeams} times são necessários ${required} confirmados. A lista possui ${confirmed.length}.`,
    );
  }

  const goalkeepers = confirmed.filter((p) => p.position === "Goleiro");
  if (goalkeepers.length > numberOfTeams) {
    return failingResult(0, "Há mais goleiros confirmados do que times.");
  }

  const linePlayers = confirmed.filter((p) => p.position !== "Goleiro");
  const totalStars = confirmed.reduce((sum, p) => sum + p.stars, 0);

  const positionTotals = new Map<Position, number>(POSITIONS.map((p) => [p, 0]));
  confirmed.forEach((p) =>
    positionTotals.set(p.position, (positionTotals.get(p.position) ?? 0) + 1),
  );

  const maxPerPosition = new Map<Position, number>();
  POSITIONS.forEach((pos) =>
    maxPerPosition.set(
      pos,
      Math.ceil((positionTotals.get(pos) ?? 0) / numberOfTeams),
    ),
  );
  const maxStarSumPerTeam = Math.ceil(totalStars / numberOfTeams);

  const weights = buildPairWeights(lastDraws);

  let best: { teams: DrawTeam[]; score: number } | null = null;
  let attempts = 0;
  let validAnalyzed = 0;

  while (attempts < maxAttempts) {
    attempts++;

    const teamNumbers = shuffle(
      Array.from({ length: numberOfTeams }, (_, i) => i + 1),
    );
    const teams: WorkingTeam[] = teamNumbers.map((n) => ({
      teamNumber: n,
      players: [],
    }));

    // Distribuir goleiros primeiro, um por time.
    const gkOrder = shuffle(teamNumbers);
    const gkPlayers = shuffle(goalkeepers);
    gkPlayers.forEach((gk, index) => {
      if (index < gkOrder.length) {
        const team = teams.find((t) => t.teamNumber === gkOrder[index])!;
        team.players.push(toDrawPlayer(gk));
      }
    });

    // Linha: embaralhar e ordenar por estrelas (maior primeiro).
    const line = shuffle(linePlayers).sort((a, b) => b.stars - a.stars);

    let placed = true;
    for (const p of line) {
      const eligible = teams.filter(
        (t) =>
          t.players.length < playersPerTeam &&
          countPosition(t, p.position) <
            (maxPerPosition.get(p.position) ?? playersPerTeam) &&
          teamStarSum(t) + p.stars <= maxStarSumPerTeam,
      );
      if (eligible.length === 0) {
        placed = false;
        break;
      }
      const minSum = Math.min(...eligible.map(teamStarSum));
      const candidates = eligible.filter((t) => teamStarSum(t) === minSum);
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      target.players.push(toDrawPlayer(p));
    }

    if (!placed) continue;
    if (!teams.every((t) => t.players.length === playersPerTeam)) continue;

    // Validação obrigatória.
    const starTotals = teams.map(teamStarSum);
    if (Math.max(...starTotals) - Math.min(...starTotals) > maxStarDifference) {
      continue;
    }

    let positionDiffOk = true;
    for (const pos of POSITIONS) {
      const counts = teams.map((t) => countPosition(t, pos));
      if (Math.max(...counts) - Math.min(...counts) > maxPositionDifference) {
        positionDiffOk = false;
        break;
      }
    }
    if (!positionDiffOk) continue;

    const gkOk = teams.every((t) => countPosition(t, "Goleiro") <= 1);
    if (!gkOk) continue;

    validAnalyzed++;
    const drawTeams: DrawTeam[] = teams.map((t) => ({
      teamNumber: t.teamNumber,
      players: t.players,
    }));
    const score = computeRepetitionScore(drawTeams, weights);
    if (!best || score < best.score) {
      best = { teams: drawTeams, score };
    }
    if (score === 0) break;
    if (validAnalyzed >= MAX_VALID_ANALYZED) break;
  }

  if (!best) {
    const diagnostics: DrawDiagnostics = {
      teams: numberOfTeams,
      players: confirmed.length,
      goalkeepers: goalkeepers.length,
      defenders: positionTotals.get("Zagueiro") ?? 0,
      midfielders: positionTotals.get("Meia") ?? 0,
      attackers: positionTotals.get("Atacante") ?? 0,
      totalStars,
      targetStarRange: `${Math.floor(totalStars / numberOfTeams)} – ${Math.ceil(
        totalStars / numberOfTeams,
      )}`,
      attempts,
    };
    return failingResult(attempts, undefined, diagnostics);
  }

  return { valid: true, teams: best.teams, repetitionScore: best.score, attempts };
}

/** Painel VALIDAÇÃO da tela Times (valores e aprovações). */
export function buildValidation(
  teams: DrawTeam[],
  settings: Settings,
  repetitionScore: number,
  attempts: number,
): DrawValidation {
  const {
    numberOfTeams,
    playersPerTeam,
    maxStarDifference,
    maxPositionDifference,
  } = settings;

  const starTotals = teams.map((t) =>
    t.players.reduce((sum, p) => sum + p.stars, 0),
  );
  const sevenPerTeam = teams.every((t) => t.players.length === playersPerTeam);
  const goalkeepersDistributed = teams.every(
    (t) => t.players.filter((p) => p.position === "Goleiro").length <= 1,
  );
  const starDifferenceValue =
    starTotals.length > 0
      ? Math.max(...starTotals) - Math.min(...starTotals)
      : 0;

  let positionDifferenceOk = true;
  for (const pos of POSITIONS) {
    const counts = teams.map(
      (t) => t.players.filter((p) => p.position === pos).length,
    );
    if (
      counts.length > 0 &&
      Math.max(...counts) - Math.min(...counts) > maxPositionDifference
    ) {
      positionDifferenceOk = false;
      break;
    }
  }

  return {
    teams: teams.length > 0 ? teams.length : numberOfTeams,
    playersPerTeam,
    sevenPerTeam,
    goalkeepersDistributed,
    starDifferenceOk: starDifferenceValue <= maxStarDifference,
    starDifferenceValue,
    positionDifferenceOk,
    repetitionScore,
    attempts,
  };
}
