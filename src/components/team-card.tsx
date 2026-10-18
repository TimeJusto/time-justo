import type { DrawTeam } from "@/types";
import { sortTeamPlayers } from "@/lib/normalize";
import { formatEsquema, formatStars } from "@/lib/format";
import { headerTextColor, teamColor } from "@/lib/teamColors";
import { APP_LOGO } from "@/lib/brand";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/logo";

interface TeamCardProps {
  team: DrawTeam;
  compact?: boolean;
}

/** Card de um time com cores próprias, logo, jogadores ordenados, total e esquema tático. */
export function TeamCard({ team, compact = false }: TeamCardProps) {
  const { settings, effectiveSettings } = useApp();
  const cardLogo = effectiveSettings.groupLogo ?? APP_LOGO;
  const colors = teamColor(team.teamNumber);
  const players = sortTeamPlayers(team.players);
  const totalStars = players.reduce((sum, p) => sum + p.stars, 0);
  const headerColor = headerTextColor(team.teamNumber);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor: colors.light,
        borderColor: colors.medium,
        color: colors.text,
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: colors.strong, color: headerColor }}
      >
        <Logo
          src={cardLogo}
          size={compact ? 28 : 36}
          className="bg-transparent"
          alt={`Logo de ${settings.groupName}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold uppercase tracking-wide">
            Time {team.teamNumber}
          </div>
          <div className="text-xs opacity-90">
            Esquema {formatEsquema(team)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold leading-none">{totalStars}</div>
          <div className="text-[10px] uppercase tracking-wide opacity-90">
            estrelas
          </div>
        </div>
      </div>

      <ul className="flex-1 divide-y divide-black/5 px-3 py-1">
        {players.map((p) => (
          <li key={p.playerId} className="flex items-center gap-1 py-1.5 text-[13px]">
            <span className="min-w-0 flex-1 break-words font-medium leading-tight">
              {p.playerName}
            </span>
            <span className="shrink-0 text-[10px] opacity-70">{p.position}</span>
            <span className="w-8 shrink-0 text-right font-semibold">
              {formatStars(p.stars)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
