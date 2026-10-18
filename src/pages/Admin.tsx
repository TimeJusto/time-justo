import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  BadgeCheck,
  Crown,
  Infinity as InfinityIcon,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatDateBR } from "@/lib/format";
import { authErrorMessage } from "@/lib/authMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminUser {
  id: string;
  email: string | null;
  role: string;
  plan: string;
  premium_until: string | null;
  trial_days_used: number;
  trial_last_day: string | null;
  created_at: string;
}

interface GrantRow {
  id: string;
  dias: number | null;
  motivo: string | null;
  admin_email: string | null;
  created_at: string;
}

const DAY_SHORTCUTS = [7, 30, 90, 365];

function adminErrorMessage(message: string): string {
  if (message.includes("last_admin")) {
    return "Não é possível remover o último admin.";
  }
  if (message.includes("not authorized")) {
    return "Acesso restrito a administradores.";
  }
  if (message.includes("invalid days")) {
    return "Informe uma quantidade de dias maior que zero.";
  }
  return authErrorMessage(message);
}

function premiumLabel(user: AdminUser): string {
  if (user.role === "admin") return "Admin (sempre Premium)";
  if (user.plan === "premium" && user.premium_until) {
    const until = new Date(user.premium_until);
    if (until.getTime() > Date.now()) {
      if (until.getFullYear() >= 2099) return "Premium cortesia sem validade";
      return `Premium até ${formatDateBR(until)}`;
    }
  }
  return "Grátis";
}

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [days, setDays] = useState("30");
  const [reason, setReason] = useState("");
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async (search: string): Promise<AdminUser[]> => {
    const term = search.trim();
    const { data, error } = await supabase.rpc(
      "admin_list_users",
      term === "" ? {} : { p_search: term },
    );
    if (error) {
      toast.error(adminErrorMessage(error.message));
      return [];
    }
    const rows = (data ?? []) as unknown as AdminUser[];
    setUsers(rows);
    return rows;
  }, []);

  const loadGrants = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("premium_grants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      toast.error(adminErrorMessage(error.message));
      return;
    }
    setGrants((data ?? []) as unknown as GrantRow[]);
  }, []);

  useEffect(() => {
    if (loading || !isAdmin) return;
    void loadUsers("");
  }, [loading, isAdmin, loadUsers]);

  useEffect(() => {
    if (selected) void loadGrants(selected.id);
    else setGrants([]);
  }, [selected, loadGrants]);

  const runAction = async (
    action: () => PromiseLike<{ error: { message: string } | null }>,
    success: string,
  ) => {
    setBusy(true);
    const { error } = await action();
    setBusy(false);
    if (error) {
      toast.error(adminErrorMessage(error.message));
      return;
    }
    toast.success(success);

    // Depois de qualquer ação: recarrega a lista, os dados do usuário e o
    // histórico (o efeito de `selected` busca o histórico de novo).
    const targetId = selected?.id;
    const rows = await loadUsers(query);
    if (targetId) {
      setSelected(rows.find((row) => row.id === targetId) ?? null);
      await loadGrants(targetId);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </p>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Acesso restrito
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é só para administradores. As ações também são validadas
            no servidor: mesmo chamando direto, quem não é admin é bloqueado.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/configuracoes">Voltar para Configurações</Link>
        </Button>
      </div>
    );
  }

  const selectedDays = Number(days);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Área admin
        </h2>
        <p className="text-sm text-muted-foreground">
          Usuários, bonificações e histórico de ações. Tudo validado no servidor.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="admin-search">Buscar usuário por e-mail</Label>
          <Input
            id="admin-search"
            value={query}
            placeholder="exemplo@email.com"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadUsers(query);
            }}
          />
        </div>
        <Button onClick={() => void loadUsers(query)}>
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-bold uppercase tracking-wide">
          Usuários ({users.length})
        </div>
        <div className="divide-y divide-border">
          {users.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado.
            </p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelected(user)}
                className={
                  selected?.id === user.id
                    ? "flex w-full flex-wrap items-center gap-2 bg-muted/60 px-4 py-3 text-left"
                    : "flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                }
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {user.email ?? "(sem e-mail)"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {premiumLabel(user)} · teste: {Math.min(user.trial_days_used, 3)}{" "}
                    de 3
                  </span>
                </span>
                {user.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    <Crown className="h-3 w-3" />
                    admin
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      {selected ? (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">
                {selected.email ?? "(sem e-mail)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {premiumLabel(selected)} · conta criada em{" "}
                {formatDateBR(new Date(selected.created_at))}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div className="grid gap-1.5">
              <Label htmlFor="admin-days">Dias de Premium</Label>
              <Input
                id="admin-days"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-reason">Motivo</Label>
              <Input
                id="admin-reason"
                value={reason}
                placeholder="Ex.: Problema no pagamento"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {DAY_SHORTCUTS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={selectedDays === option ? "default" : "outline"}
                onClick={() => setDays(String(option))}
              >
                {option} dias
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                void runAction(
                  () =>
                    supabase.rpc("admin_grant_premium_days", {
                      p_user_id: selected.id,
                      p_days: selectedDays,
                      p_reason: reason,
                    }),
                  `Premium concedido por ${selectedDays} dia(s).`,
                )
              }
            >
              <BadgeCheck className="h-4 w-4" />
              Conceder Premium
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () =>
                    supabase.rpc("admin_grant_lifetime", {
                      p_user_id: selected.id,
                      p_reason: reason,
                    }),
                  "Premium cortesia sem validade aplicado.",
                )
              }
            >
              <InfinityIcon className="h-4 w-4" />
              Premium cortesia sem validade
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () =>
                    supabase.rpc("admin_set_free", {
                      p_user_id: selected.id,
                      p_reason: reason,
                    }),
                  "Usuário voltou para o plano Grátis.",
                )
              }
            >
              <RotateCcw className="h-4 w-4" />
              Voltar para Grátis
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () =>
                    supabase.rpc("admin_reset_trial", {
                      p_user_id: selected.id,
                      p_reason: reason,
                    }),
                  "Teste grátis zerado (3 partidas disponíveis).",
                )
              }
            >
              <RotateCcw className="h-4 w-4" />
              Zerar teste
            </Button>
            <Button
              variant={selected.role === "admin" ? "outline" : "secondary"}
              disabled={busy}
              onClick={() =>
                void runAction(
                  () =>
                    supabase.rpc("admin_set_admin", {
                      p_user_id: selected.id,
                      p_make_admin: selected.role !== "admin",
                      p_reason: reason,
                    }),
                  selected.role === "admin"
                    ? "Admin removido."
                    : "Usuário agora é admin.",
                )
              }
            >
              <UserCog className="h-4 w-4" />
              {selected.role === "admin" ? "Remover admin" : "Tornar admin"}
            </Button>
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide">
              Histórico de bonificações
            </div>
            <div className="divide-y divide-border">
              {grants.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Nenhuma ação registrada para este usuário.
                </p>
              ) : (
                grants.map((grant) => (
                  <div key={grant.id} className="px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">
                      {grant.dias === null
                        ? "Premium cortesia sem validade"
                        : grant.dias > 0
                          ? `${grant.dias} dia(s) de Premium`
                          : "Ação administrativa"}
                      {grant.motivo ? ` — ${grant.motivo}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(grant.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {grant.admin_email ? ` · por ${grant.admin_email}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A bonificação manual continua valendo mesmo depois da cobrança pelo
            Google Play — é o plano B se o pagamento falhar.
          </p>
        </div>
      ) : null}
    </div>
  );
}
