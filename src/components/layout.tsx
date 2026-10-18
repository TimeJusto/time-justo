import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  History,
  Settings,
  Shuffle,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { APP_LOGO, APP_NAME, DEFAULT_GROUP_NAME } from "@/lib/brand";
import { Logo } from "@/components/logo";
import { SyncBanner } from "@/components/sync-banner";
import { PremiumSyncDialog } from "@/components/premium-sync-dialog";
import { PremiumNoticeDialog } from "@/components/premium-notice";
import { UpdateBanner } from "@/components/update-banner";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/cadastro", label: "Cadastro", icon: Users },
  { to: "/elenco", label: "Elenco do Dia", icon: ClipboardList },
  { to: "/times", label: "Times", icon: Shuffle },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/historico", label: "Histórico", icon: History },
];

/** Cabeçalho + navegação (tabs no desktop, menu inferior no mobile). */
export function Layout() {
  const { settings, effectiveSettings } = useApp();
  const groupName = settings.groupName?.trim() || DEFAULT_GROUP_NAME;
  const groupLogo = effectiveSettings.groupLogo ?? APP_LOGO;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-1.5 px-4 pb-3 pt-3">
          {/* Assinatura do aplicativo */}
          <div className="flex items-center gap-1.5 text-white/65">
            <Logo src={APP_LOGO} size={18} className="bg-transparent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
              {APP_NAME}
            </span>
          </div>

          {/* Marca do grupo em destaque */}
          <div className="flex max-w-full items-center gap-3">
            <Logo
              src={groupLogo}
              size={46}
              className="bg-transparent ring-2 ring-white/25"
              alt={`Logo de ${groupName}`}
            />
            <h1 className="min-w-0 truncate text-center text-xl font-bold tracking-wide sm:text-2xl">
              {groupName}
            </h1>
          </div>
        </div>
        <nav className="mx-auto hidden w-full max-w-6xl gap-1 px-4 pb-3 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-10">
        <UpdateBanner />
        <SyncBanner />
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-24 pt-2 text-center text-xs text-muted-foreground md:pb-6">
        {APP_NAME} © 2026
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-center text-[9px] font-medium leading-tight transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="max-w-full">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <PremiumSyncDialog />
      <PremiumNoticeDialog />
    </div>
  );
}
