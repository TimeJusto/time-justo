import type { GameTerm } from "@/lib/labels";

export type Position = "Atacante" | "Meia" | "Zagueiro" | "Goleiro";

export interface Player {
  id: string;
  name: string;
  position: Position;
  stars: number;
  confirmed: boolean;
}

export interface Settings {
  numberOfTeams: 3 | 4;
  playersPerTeam: number;
  historyWindow: number;
  maxStarDifference: number;
  maxPositionDifference: number;
  maxAttempts: number;
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
  sevenPerTeam: boolean;
  goalkeepersDistributed: boolean;
  starDifferenceOk: boolean;
  starDifferenceValue: number;
  positionDifferenceOk: boolean;
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
