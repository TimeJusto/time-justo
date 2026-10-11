import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_LOGO, APP_NAME } from "@/lib/brand";

interface LogoProps {
  /** Imagem a exibir (logo do grupo ou APP_LOGO). */
  src?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

/** Bola de futebol genérica usada quando a imagem não está disponível. */
function FootballFallback({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path
          d="M12 8.6 L15.23 10.95 L14 14.75 L10 14.75 L8.77 10.95 Z"
          fill="currentColor"
          stroke="none"
        />
        <path d="M12 8.6V3M15.23 10.95 20.56 9.22M14 14.75 17.29 19.28M10 14.75 6.71 19.28M8.77 10.95 3.44 9.22" />
      </svg>
    </span>
  );
}

/**
 * Logo genérico. Exibe a imagem informada (logo do grupo ou APP_LOGO) e, quando
 * indisponível, um escudo circular com uma bola de futebol.
 */
export function Logo({
  src = APP_LOGO,
  size = 44,
  className,
  alt = APP_NAME,
}: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return <FootballFallback size={size} className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
