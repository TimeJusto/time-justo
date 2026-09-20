import { useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Logo da aplicação. Usa /public/logo-kbriteiros.png e, quando a imagem não
 * estiver disponível, exibe um brasão circular com a letra "K".
 */
export function Logo({ size = 44, className }: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-label="Logo KBRITEIROS"
        role="img"
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center rounded-full border-2 border-[#C8A24A] bg-primary font-bold text-primary-foreground shadow-sm",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}
      >
        K
      </span>
    );
  }

  return (
    <img
      src="/logo-kbriteiros.png"
      alt="Logo KBRITEIROS"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
