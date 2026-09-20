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
import { Logo } from "@/components/logo";

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
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-3 px-4 py-4">
          <Logo size={42} className="bg-transparent ring-2 ring-white/20" />
          <h1 className="text-center text-xl font-bold tracking-wide sm:text-2xl">
            BABA DOS KBRITEIROS
          </h1>
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
        <Outlet />
      </main>

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
    </div>
  );
}
