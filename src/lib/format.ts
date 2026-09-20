import type { DrawTeam } from "@/types";

/** Formata data no padrão brasileiro dd/mm/aaaa. */
export function formatDateBR(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Exibe estrelas como "4 ★". */
export function formatStars(stars: number): string {
  return `${stars} ★`;
}

/** Esquema tático: zagueiros - meias - atacantes (sem goleiro). */
export function formatEsquema(team: DrawTeam): string {
  const defenders = team.players.filter((p) => p.position === "Zagueiro").length;
  const midfielders = team.players.filter((p) => p.position === "Meia").length;
  const attackers = team.players.filter((p) => p.position === "Atacante").length;
  return `${defenders}-${midfielders}-${attackers}`;
}
