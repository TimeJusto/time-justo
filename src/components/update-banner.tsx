import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Aviso de nova versão do PWA. O service worker é registrado em modo
 * autoUpdate (sempre ativa a versão nova); aqui apenas avisamos e recarregamos
 * para o app já abrir na versão atualizada.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    const onControllerChange = () => {
      if (!hadController || refreshing) return;
      setReady(true);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const checkForUpdate = () => {
      void navigator.serviceWorker.ready
        .then((registration) => registration.update())
        .catch(() => {
          /* sem rede no momento */
        });
    };

    checkForUpdate();

    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      refreshing = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/40 bg-success-light px-3 py-2 text-xs font-medium text-success">
      <span>Nova versão disponível</span>
      <Button size="sm" onClick={() => window.location.reload()}>
        <RefreshCw className="h-3.5 w-3.5" />
        Atualizar
      </Button>
    </div>
  );
}
