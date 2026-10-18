import type { Settings } from "@/types";
import { DEFAULT_GAME_TERM } from "@/lib/labels";
import { DEFAULT_GROUP_NAME } from "@/lib/brand";
import { DEFAULT_STAR_SCALE } from "@/lib/scale";

/**
 * Configurações padrão de quem instala o app pela primeira vez.
 * O app começa SEM jogadores, SEM histórico e SEM sorteio — nada de exemplo.
 */
export const INITIAL_SETTINGS: Settings = {
  numberOfTeams: 4,
  playersPerTeam: 7,
  historyWindow: 1,
  maxStarDifference: 1,
  maxPositionDifference: 1,
  maxAttempts: 500,
  starScale: DEFAULT_STAR_SCALE,
  groupName: DEFAULT_GROUP_NAME,
  groupLogo: null,
  gameTerm: DEFAULT_GAME_TERM,
};
