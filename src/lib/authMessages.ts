/** Traduz mensagens comuns de autenticação para português. */
export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (normalized.includes("already confirmed")) {
    return "Este e-mail já está confirmado. Faça login.";
  }
  if (normalized.includes("user already registered")) {
    return "Já existe uma conta com este e-mail.";
  }
  if (normalized.includes("password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (normalized.includes("unable to validate email") || normalized.includes("invalid email")) {
    return "Informe um e-mail válido.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (normalized.includes("for security purposes")) {
    return "Aguarde alguns segundos antes de tentar novamente.";
  }
  return message;
}
