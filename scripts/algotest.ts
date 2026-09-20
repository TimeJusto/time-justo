import { buildInitialPlayers, INITIAL_SETTINGS } from "../src/data/initialData";
import { performDraw } from "../src/algorithm/drawAlgorithm";
import {
  buildPairWeights,
  computeRepetitionScore,
  pairKey,
} from "../src/algorithm/repetitionScore";
import {
  isDuplicateName,
  validateAndNormalizeRoster,
} from "../src/services/playerService";
import {
  normalizeName,
  normalizePosition,
  sortTeamPlayers,
} from "../src/lib/normalize";
import { formatDateBR, formatEsquema } from "../src/lib/format";

const players = buildInitialPlayers();
const confirmed = players.filter((p) => p.confirmed);
const meta = INITIAL_SETTINGS.numberOfTeams * INITIAL_SETTINGS.playersPerTeam;
const count = (pos: string) => confirmed.filter((p) => p.position === pos).length;

console.log("confirmed:", confirmed.length, "| meta:", meta);
console.log(
  "positions A/M/Z/G:",
  count("Atacante"),
  count("Meia"),
  count("Zagueiro"),
  count("Goleiro"),
);
console.log("total stars:", confirmed.reduce((s, p) => s + p.stars, 0));

const POS = ["Atacante", "Meia", "Zagueiro", "Goleiro"] as const;

let allValid = true;
const failures: string[] = [];
for (let i = 0; i < 50; i++) {
  const r = performDraw(confirmed, INITIAL_SETTINGS, []);
  if (!r.valid) {
    allValid = false;
    failures.push(`draw ${i}: ${r.error ?? "no solution"} diag=${JSON.stringify(r.diagnostics)}`);
    continue;
  }
  const totals = r.teams.map((t) => t.players.reduce((s, p) => s + p.stars, 0));
  if (r.teams.some((t) => t.players.length !== 7)) {
    allValid = false;
    failures.push(`draw ${i}: team not 7`);
  }
  if (Math.max(...totals) - Math.min(...totals) > 1) {
    allValid = false;
    failures.push(`draw ${i}: star diff ${totals}`);
  }
  for (const pos of POS) {
    const diff =
      Math.max(...r.teams.map((t) => t.players.filter((p) => p.position === pos).length)) -
      Math.min(...r.teams.map((t) => t.players.filter((p) => p.position === pos).length));
    if (diff > 1) {
      allValid = false;
      failures.push(`draw ${i}: pos diff ${pos}=${diff}`);
    }
  }
  if (r.teams.some((t) => t.players.filter((p) => p.position === "Goleiro").length > 1)) {
    allValid = false;
    failures.push(`draw ${i}: gk > 1`);
  }
}
console.log("50 draws all valid:", allValid, failures.length ? failures : "");

// Repetition scoring
const first = performDraw(confirmed, INITIAL_SETTINGS, []);
const firstAsDraw = {
  id: "x",
  babaNumber: 1,
  date: "20/09/2026",
  historyWindow: 1,
  teams: first.teams,
  repetitionScore: 0,
  attempts: 1,
  createdAt: "",
};
const weights = buildPairWeights([firstAsDraw]);
const names = first.teams[0].players.map((p) => p.playerName);
const k = pairKey(names[0], names[1]);
console.log("same-team pair weight >= 1:", (weights[k] ?? 0) >= 1);

const second = performDraw(confirmed, INITIAL_SETTINGS, [firstAsDraw]);
const manual = computeRepetitionScore(second.teams, weights);
console.log(
  "second draw valid:",
  second.valid,
  "| score:",
  second.repetitionScore,
  "| manual matches:",
  manual === second.repetitionScore,
);

// Error pre-validations
const oneLess = confirmed.slice(0, confirmed.length - 1);
console.log(
  "wrong count msg:",
  performDraw(oneLess, INITIAL_SETTINGS, []).error,
);
const extraGk = confirmed.map((p, i) => (i === 0 ? { ...p, position: "Goleiro" as const } : p));
console.log(
  "extra gk msg:",
  performDraw(extraGk, INITIAL_SETTINGS, []).error,
);

// Duplicates + normalization
const dupList = [
  ...players,
  { id: "z", name: "CARDOSO", position: "Meia", stars: 9, confirmed: false },
];
const res = validateAndNormalizeRoster(dupList);
console.log(
  "dup error present:",
  res.errors.some((e) => e.includes("CARDOSO")),
);
console.log("clamped stars (9->5):", res.players.find((p) => p.id === "z")?.stars);
console.log("dup (case-insensitive):", isDuplicateName(players, "cardoso") === true);
const cardoso = players.find((p) => p.name === "Cardoso")!;
console.log("self-ignore dup:", isDuplicateName(players, "Cardoso", cardoso.id) === false);
console.log("empty roster:", validateAndNormalizeRoster([]).errors[0]);

// normalization utils
console.log("pos norm:", normalizePosition("Goleiro"), normalizePosition("goleiro"), normalizePosition("Zagueiro"), normalizePosition("zagueiro"), normalizePosition("Lateral"));
console.log("name norm:", JSON.stringify(normalizeName("  Joao   Pedro  ")));

// team sort order (A->M->Z->G, stars desc within position)
const sorted = sortTeamPlayers([
  { playerId: "1", playerName: "B", position: "Goleiro", stars: 1 },
  { playerId: "2", playerName: "A", position: "Meia", stars: 3 },
  { playerId: "3", playerName: "C", position: "Atacante", stars: 2 },
  { playerId: "4", playerName: "D", position: "Atacante", stars: 5 },
  { playerId: "5", playerName: "E", position: "Zagueiro", stars: 2 },
]);
console.log(
  "team sort:",
  sorted.map((p) => `${p.playerName}:${p.position}:${p.stars}`).join(", "),
);

// format utils
console.log("date fmt:", formatDateBR(new Date(2026, 8, 20)));
console.log("esquema:", formatEsquema({ teamNumber: 1, players: [
  { playerId: "1", playerName: "a", position: "Atacante", stars: 2 },
  { playerId: "2", playerName: "b", position: "Atacante", stars: 2 },
  { playerId: "3", playerName: "c", position: "Meia", stars: 2 },
  { playerId: "4", playerName: "d", position: "Zagueiro", stars: 2 },
  { playerId: "5", playerName: "e", position: "Goleiro", stars: 1 },
] }));
