import { CloudOff } from "lucide-react";
import { useApp } from "@/context/AppContext";

/**
 * Aviso discreto de que as alterações feitas offline serão sincronizadas
 * quando a internet voltar. Só aparece para quem usa dados na nuvem.
 */
export function SyncBanner() {
  const { cloudMode, online, syncStatus } = useApp();

  if (!cloudMode) return null;

  const show =
    !online || syncStatus === "pending" || syncStatus === "error";
  if (!show) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
      <CloudOff className="h-4 w-4 shrink-0" />
      Sem internet – será sincronizado
    </div>
  );
}
