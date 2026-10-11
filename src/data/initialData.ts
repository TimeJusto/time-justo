import type { CurrentDraw, DrawPlayer, Player, Position, Settings } from "@/types";
import { DEFAULT_GAME_TERM } from "@/lib/labels";
import { DEFAULT_GROUP_NAME } from "@/lib/brand";
import { DEFAULT_STAR_SCALE } from "@/lib/scale";

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

type RawPlayer = [name: string, position: string, stars: number, confirmed: boolean];

const RAW_PLAYERS: RawPlayer[] = [
  ["Cardoso", "Atacante", 4, true],
  ["Deivid", "Atacante", 5, true],
  ["Hiago", "Atacante", 1, false],
  ["Marlon", "Atacante", 3, true],
  ["Novinho", "Atacante", 2, true],
  ["Ronny", "Atacante", 3, true],

  ["Budega", "Meia", 5, true],
  ["Claudinho", "Meia", 4, true],
  ["Douglas", "Meia", 2, true],
  ["Dudinha", "Meia", 4, true],
  ["Farofa", "Meia", 3, false],
  ["Felipe Marinho", "Meia", 5, true],
  ["Gabriel", "Meia", 3, true],
  ["Júlio César", "Meia", 4, false],
  ["Nilvaldo", "Meia", 2, false],
  ["Paulista", "Meia", 3, true],
  ["Raniere", "Meia", 4, true],
  ["Silvinho", "Meia", 4, true],
  ["Wermeson", "Meia", 3, false],
  ["William", "Meia", 4, true],
  ["Ygo", "Meia", 3, true],

  ["Bambam", "Zagueiro", 3, false],
  ["Camavinga", "Zagueiro", 3, true],
  ["Christhoper", "Zagueiro", 3, true],
  ["Clésio", "Zagueiro", 3, false],
  ["DG", "Zagueiro", 2, false],
  ["Eduardo", "Zagueiro", 2, true],
  ["Erasmo", "Zagueiro", 2, false],
  ["Filipe", "Zagueiro", 1, false],
  ["Helder", "Zagueiro", 2, true],
  ["Joamerson", "Zagueiro", 3, false],
  ["Joanderson", "Zagueiro", 3, true],
  ["Joao Pedro", "Zagueiro", 4, false],
  ["Lucas Patrick", "Zagueiro", 1, true],
  ["Lug", "Zagueiro", 5, false],
  ["Mineiro", "Zagueiro", 5, true],
  ["Rafael", "Zagueiro", 2, false],
  ["Ronimessi", "Zagueiro", 1, true],
  ["Samuel Pirata", "Zagueiro", 3, false],
  ["Victor Rafael", "Zagueiro", 3, false],

  ["André", "Goleiro", 1, true],
  ["Bruno Diniz", "Goleiro", 1, false],
  ["Caio", "Goleiro", 1, false],
  ["Ciro", "Goleiro", 1, true],
  ["Diogo", "Goleiro", 1, true],
  ["Ramilton", "Goleiro", 1, true],
];

/** Constrói a lista inicial de jogadores com ids únicos. */
export function buildInitialPlayers(): Player[] {
  return RAW_PLAYERS.map(([name, position, stars, confirmed]) => ({
    id: crypto.randomUUID(),
    name,
    position: position as Position,
    stars,
    confirmed,
  }));
}

/** Sorteio inicial exato (seção 11), por nome — os ids são resolvidos ao hidratar. */
type RawInitialPlayer = [name: string, position: Position, stars: number];

const INITIAL_DRAW_RAW: Record<number, RawInitialPlayer[]> = {
  1: [
    ["Deivid", "Atacante", 5],
    ["Raniere", "Meia", 4],
    ["Gabriel", "Meia", 3],
    ["Douglas", "Meia", 2],
    ["Camavinga", "Zagueiro", 3],
    ["Christhoper", "Zagueiro", 3],
    ["Diogo", "Goleiro", 1],
  ],
  2: [
    ["Ronny", "Atacante", 3],
    ["Budega", "Meia", 5],
    ["Claudinho", "Meia", 4],
    ["Silvinho", "Meia", 4],
    ["Helder", "Zagueiro", 2],
    ["Lucas Patrick", "Zagueiro", 1],
    ["Ramilton", "Goleiro", 1],
  ],
  3: [
    ["Marlon", "Atacante", 3],
    ["Felipe Marinho", "Meia", 5],
    ["William", "Meia", 4],
    ["Ygo", "Meia", 3],
    ["Joanderson", "Zagueiro", 3],
    ["Eduardo", "Zagueiro", 2],
    ["Ciro", "Goleiro", 1],
  ],
  4: [
    ["Cardoso", "Atacante", 4],
    ["Novinho", "Atacante", 2],
    ["Dudinha", "Meia", 4],
    ["Paulista", "Meia", 3],
    ["Mineiro", "Zagueiro", 5],
    ["Ronimessi", "Zagueiro", 1],
    ["André", "Goleiro", 1],
  ],
};

/** Sorteio atual inicial, com ids de jogadores resolvidos pela lista inicial. */
export function buildInitialCurrentDraw(players: Player[]): CurrentDraw {
  const byName = new Map<string, string>();
  players.forEach((p) => byName.set(p.name.trim().toLowerCase(), p.id));

  const toDrawPlayer = ([name, position, stars]: RawInitialPlayer): DrawPlayer => ({
    playerId: byName.get(name.trim().toLowerCase()) ?? "",
    playerName: name,
    position,
    stars,
  });

  return {
    id: "initial-draw",
    babaNumber: null,
    date: null,
    teams: Object.keys(INITIAL_DRAW_RAW)
      .map(Number)
      .sort((a, b) => a - b)
      .map((teamNumber) => ({
        teamNumber,
        players: INITIAL_DRAW_RAW[teamNumber].map(toDrawPlayer),
      })),
    repetitionScore: 0,
    attempts: 5,
  };
}
