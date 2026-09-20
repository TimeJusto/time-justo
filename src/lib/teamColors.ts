export interface TeamColorScheme {
  /** Cor forte (cabeçalho/títulos). */
  strong: string;
  /** Cor média (bordas/detalhes). */
  medium: string;
  /** Cor clara (fundo). */
  light: string;
  /** Cor do texto sobre as demais. */
  text: string;
}

/** Esquema de cores por time (definido na identidade visual). */
export const TEAM_COLORS: Record<number, TeamColorScheme> = {
  1: { strong: "#C8A24A", medium: "#EAD59D", light: "#FAF4E3", text: "#443612" },
  2: { strong: "#1F6B3A", medium: "#BFDCC8", light: "#EDF6F0", text: "#19482A" },
  3: { strong: "#E5E2DA", medium: "#F0EEE9", light: "#FFFFFF", text: "#333B37" },
  4: { strong: "#8B1E2D", medium: "#E8B8BE", light: "#FAECEE", text: "#6E1B27" },
};

export function teamColor(teamNumber: number): TeamColorScheme {
  return TEAM_COLORS[teamNumber] ?? TEAM_COLORS[1];
}

/** Verdadeiro quando a cor de fundo é clara (exige texto escuro). */
export function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

/** Cor do texto sobre a cor forte do time (branco ou texto do esquema). */
export function headerTextColor(teamNumber: number): string {
  const scheme = teamColor(teamNumber);
  return isLightColor(scheme.strong) ? scheme.text : "#FFFFFF";
}
