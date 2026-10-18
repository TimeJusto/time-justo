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
import { clearScope } from "@/services/repository";
import { accountScope } from "@/services/storage";
import { formatDateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function AccountPanel() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    isCloud,
    premiumSource,
    loading,
    signOut,
  } = useAuth();
  const { lastSyncAt, syncStatus, trialLeft, liveSyncAt } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const premiumUntil = profile?.premiumUntil
    ? new Date(profile.premiumUntil)
    : null;

  const planLine =
    premiumSource === "admin"
      ? "Plano Administrador (dados na nuvem)"
      : premiumSource === "premium" && premiumUntil
        ? `Premium até ${formatDateBR(premiumUntil)} (dados na nuvem)`
        : premiumSource === "trial"
          ? `Teste Premium: faltam ${trialLeft} ${
              trialLeft === 1 ? "partida" : "partidas"
            }`
          : "Seu plano: Grátis (dados neste aparelho)";

  const trialLine =
    premiumSource === "trial" ? "Dados neste aparelho durante o teste." : null;

  const lastSyncText = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const justSynced = liveSyncAt !== null && Date.now() - liveSyncAt < 60000;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Você saiu da conta. Os dados deste aparelho foram limpos.");
  };

  const handleDelete = async () => {
    setBusy(true);
    const accountId = user?.id;
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: {},
      });
      if (error) throw error;
      if (accountId) clearScope(accountScope(accountId));
      await signOut();
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
                {justSynced
                  ? "Sincronizado agora"
                  : `Última sincronização: ${lastSyncText}`}
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
              Crie uma conta e ganhe 3 partidas Premium grátis. Sem conta, o app
              continua funcionando com os dados neste aparelho.
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
