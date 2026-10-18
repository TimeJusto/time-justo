import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Cloud,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { clearLocalData } from "@/services/repository";
import { formatDateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function AccountPanel() {
  const navigate = useNavigate();
  const { user, profile, isCloud, loading, signOut } = useAuth();
  const { lastSyncAt, syncStatus } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const premiumUntil = profile?.premiumUntil
    ? new Date(profile.premiumUntil)
    : null;

  const planLine = !user
    ? "Seu plano: Grátis (dados neste aparelho)"
    : isCloud
      ? profile?.role === "admin"
        ? "Plano Administrador (dados na nuvem)"
        : premiumUntil
          ? `Premium até ${formatDateBR(premiumUntil)} (dados na nuvem)`
          : "Premium (dados na nuvem)"
      : "Seu plano: Grátis (dados neste aparelho)";

  const trialLine =
    profile && profile.plan === "free" && profile.trialDaysUsed > 0
      ? `Teste Premium: ${Math.min(profile.trialDaysUsed, 3)} de 3 partidas usadas`
      : null;

  const lastSyncText = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Você saiu da conta. Os dados deste aparelho foram limpos.");
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: {},
      });
      if (error) throw error;
      await signOut();
      clearLocalData();
      toast.success("Sua conta e seus dados foram excluídos.");
      navigate("/");
    } catch {
      toast.error(
        "Não foi possível excluir a conta agora. Tente novamente ou escreva para timejusto.app@gmail.com.",
      );
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <UserRound className="h-4 w-4" />
        Minha conta
      </h3>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </p>
      ) : (
        <>
          {user?.email ? (
            <p className="text-sm font-medium text-foreground">{user.email}</p>
          ) : null}

          <div
            className={
              isCloud
                ? "mt-2 rounded-md bg-success-light px-3 py-2 text-sm text-success"
                : "mt-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
            }
          >
            <p className="flex items-center gap-1.5 font-medium">
              {isCloud ? (
                <Cloud className="h-4 w-4" />
              ) : (
                <HardDrive className="h-4 w-4" />
              )}
              {planLine}
            </p>
            {trialLine ? (
              <p className="mt-1 text-xs">{trialLine}</p>
            ) : null}
            {isCloud ? (
              <p className="mt-1 text-xs">
                Última sincronização: {lastSyncText}
              </p>
            ) : null}
            {isCloud && syncStatus === "pending" ? (
              <p className="mt-1 text-xs">
                Sem internet – será sincronizado
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {user ? (
              <>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir minha conta
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link to="/entrar">
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/criar-conta">
                    <UserPlus className="h-4 w-4" />
                    Criar conta
                  </Link>
                </Button>
              </>
            )}
          </div>

          {!user ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Você pode usar o app sem conta. O plano Premium guarda os dados na
              nuvem.
            </p>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir minha conta?"
        description="Sua conta, seu perfil e todos os dados salvos na nuvem serão apagados. Esta ação não pode ser desfeita."
        confirmLabel={busy ? "Excluindo..." : "Excluir conta"}
        destructive
        onConfirm={() => {
          if (!busy) void handleDelete();
        }}
      />
    </div>
  );
}
