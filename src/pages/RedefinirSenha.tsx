import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "@/lib/authMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(authErrorMessage(updateError.message));
      return;
    }

    toast.success("Senha atualizada com sucesso.");
    navigate("/configuracoes");
  };

  if (!loading && !session) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <KeyRound className="h-5 w-5 text-primary" />
            Redefinir senha
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Para redefinir a senha, abra o link que enviamos para o seu e-mail.
            O link precisa ser aberto neste mesmo aparelho.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/esqueci-senha">Pedir um novo link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground">
          Escolha uma nova senha para sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="new-password-confirm">Confirmar nova senha</Label>
          <Input
            id="new-password-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          <KeyRound className="h-4 w-4" />
          {busy ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
