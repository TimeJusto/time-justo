import type { GameTerm } from "@/lib/labels";
import type { StarScale } from "@/lib/scale";

export type Position = "Atacante" | "Meia" | "Zagueiro" | "Goleiro";

export interface Player {
  id: string;
  name: string;
  position: Position;
  stars: number;
  confirmed: boolean;
}

export interface Settings {
  /** Quantidade de times do sorteio (inteiro >= 2). */
  numberOfTeams: number;
  /** Jogadores por time (inteiro >= 1). */
  playersPerTeam: number;
  /** Quantidade exata de sorteios anteriores considerados na repetição (inteiro >= 0). */
  historyWindow: number;
  /** Diferença máxima entre o maior e o menor total de estrelas (inteiro >= 0). */
  maxStarDifference: number;
  /** Diferença máxima da quantidade de cada posição entre os times (inteiro >= 0). */
  maxPositionDifference: number;
  /** Número exato de tentativas do sorteio (inteiro >= 1). */
  maxAttempts: number;
  /** Escala das notas: 1–5 ou 1–10. */
  starScale: StarScale;
  /** Nome do grupo exibido no cabeçalho (até 40 caracteres). */
  groupName: string;
  /** Logo do grupo (data URL) ou null para usar APP_LOGO. */
  groupLogo: string | null;
  /** Como o grupo chama o jogo. */
  gameTerm: GameTerm;
}

export interface DrawPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  stars: number;
}

export interface DrawTeam {
  teamNumber: number;
  players: DrawPlayer[];
}

export interface Draw {
  id: string;
  babaNumber: number;
  date: string; // dd/mm/aaaa
  historyWindow: number;
  teams: DrawTeam[];
  repetitionScore: number;
  attempts: number;
  createdAt: string; // ISO
}

export interface CurrentDraw {
  id: string;
  babaNumber: number | null;
  date: string | null;
  teams: DrawTeam[];
  repetitionScore: number;
  attempts: number;
}

export interface DrawValidation {
  teams: number;
  playersPerTeam: number;
  playersPerTeamOk: boolean;
  goalkeepersDistributed: boolean;
  starDifferenceOk: boolean;
  starDifferenceValue: number;
  maxStarDifference: number;
  positionDifferenceOk: boolean;
  maxPositionDifference: number;
  repetitionScore: number;
  attempts: number;
}

export interface DrawDiagnostics {
  teams: number;
  players: number;
  goalkeepers: number;
  defenders: number;
  midfielders: number;
  attackers: number;
  totalStars: number;
  targetStarRange: string;
  attempts: number;
}

export interface DrawResult {
  valid: boolean;
  teams: DrawTeam[];
  repetitionScore: number;
  attempts: number;
  error?: string;
  diagnostics?: DrawDiagnostics;
}
