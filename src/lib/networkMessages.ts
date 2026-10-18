export const NETWORK_ERROR_MESSAGE =
  "Sem conexão com o servidor. Verifique a internet e tente de novo.";

const NETWORK_HINTS = [
  "failed to fetch",
  "networkerror",
  "network error",
  "network request failed",
  "fetch failed",
  "load failed",
  "err_internet",
  "internet connection appears to be offline",
  "offline",
  "timed out",
  "timeout",
  "econnrefused",
  "enotfound",
];

/** Detecta mensagens técnicas de rede para trocar pelo texto amigável. */
export function isNetworkErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return NETWORK_HINTS.some((hint) => normalized.includes(hint));
}
