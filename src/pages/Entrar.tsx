import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage } from "@/lib/authMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Entrar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/configuracoes" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(authErrorMessage(signInError.message));
      return;
    }
    toast.success("Você entrou na sua conta.");
    navigate("/configuracoes");
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta para usar os dados na nuvem no plano Premium.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          <LogIn className="h-4 w-4" />
          {busy ? "Entrando..." : "Entrar"}
        </Button>

        <div className="flex flex-col gap-1 text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" to="/esqueci-senha">
            Esqueci minha senha
          </Link>
          <Link className="text-primary underline-offset-4 hover:underline" to="/criar-conta">
            Ainda não tem conta? Criar conta
          </Link>
        </div>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Você pode continuar usando o app sem entrar: no plano Grátis os dados ficam
        neste aparelho.
      </p>
    </div>
  );
}
