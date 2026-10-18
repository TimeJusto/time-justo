import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MailCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "@/lib/authMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CriarConta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (user) return <Navigate to="/configuracoes" replace />;

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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);

    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }

    if (data.session) {
      toast.success("Conta criada com sucesso.");
      navigate("/configuracoes");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <MailCheck className="h-5 w-5 text-success" />
            Confirme seu e-mail
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email.trim()}</strong>.
            Abra o link para ativar a conta e depois entre com seu e-mail e senha.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Não recebeu? Verifique a caixa de spam ou tente criar a conta novamente.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/entrar">Ir para Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
        <p className="text-sm text-muted-foreground">
          A conta guarda seus dados na nuvem quando você for Premium.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="signup-email">E-mail</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="signup-password">Senha</Label>
          <Input
            id="signup-password"
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
          <Label htmlFor="signup-confirm">Confirmar senha</Label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          <UserPlus className="h-4 w-4" />
          {busy ? "Criando..." : "Criar conta"}
        </Button>

        <Link
          className="block text-sm text-primary underline-offset-4 hover:underline"
          to="/entrar"
        >
          Já tenho conta
        </Link>
      </form>
    </div>
  );
}
