/** Escala de notas (estrelas) escolhida pelo grupo: 1–5 ou 1–10. */
export type StarScale = 5 | 10;

export const STAR_SCALES: StarScale[] = [5, 10];

export const DEFAULT_STAR_SCALE: StarScale = 5;

export function isStarScale(value: unknown): value is StarScale {
  return value === 5 || value === 10;
}

/** Opções de nota conforme a escala (1 até scale). */
export function starOptions(scale: StarScale): number[] {
  return Array.from({ length: scale }, (_, index) => index + 1);
}
