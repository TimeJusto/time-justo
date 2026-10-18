import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/authMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/redefinir-senha` },
    );
    setBusy(false);
    if (resetError) {
      setError(authErrorMessage(resetError.message));
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
            Link enviado
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Se existir uma conta para <strong>{email.trim()}</strong>, enviamos um
            link para redefinir a senha. Abra o link no mesmo aparelho para criar
            uma nova senha.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/entrar">Voltar para Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Esqueci minha senha</h2>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail para receber o link de redefinição.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="reset-email">E-mail</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          <Send className="h-4 w-4" />
          {busy ? "Enviando..." : "Enviar link"}
        </Button>

        <Link
          className="block text-sm text-primary underline-offset-4 hover:underline"
          to="/entrar"
        >
          Voltar para Entrar
        </Link>
      </form>
    </div>
  );
}
